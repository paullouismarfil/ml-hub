import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState("dashboard-section");

  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [votes, setVotes] = useState([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [avatarPreview, setAvatarPreview] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    initDashboard();

    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const initDashboard = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    setUser(data.user);
    setAvatarPreview(data.user.user_metadata?.avatar_url || "");
    await fetchArticles();
  };

  const getDisplayName = (authUser = user) => {
    const meta = authUser?.user_metadata || {};
    return (
      meta.full_name ||
      meta.name ||
      meta.username ||
      meta.user_name ||
      authUser?.email?.split("@")[0] ||
      "Anonymous User"
    );
  };

  const getAvatarUrl = (authUser = user) => {
    const meta = authUser?.user_metadata || {};
    return avatarPreview || meta.avatar_url || meta.picture || null;
  };

  const getInitial = (name = "User") => {
    return name?.trim()?.charAt(0)?.toUpperCase() || "U";
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "No timestamp";

    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateValue));
  };

  const uploadAvatar = async (event) => {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        alert("No file selected.");
        return;
      }

      if (!user) {
        alert("User not loaded. Please refresh.");
        return;
      }

      setIsUploadingAvatar(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("UPLOAD ERROR:", error);
        alert(error.message);
        setIsUploadingAvatar(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
          picture: publicUrl,
        },
      });

      if (updateError) {
        console.error("UPDATE ERROR:", updateError);
        alert(updateError.message);
        setIsUploadingAvatar(false);
        return;
      }

      setAvatarPreview(publicUrl);

      const refreshed = await supabase.auth.getUser();
      setUser(refreshed.data.user);

      alert("Avatar uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const scrollToSection = (id) => {
  setActiveSection(id);

  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

  const fetchArticles = async () => {
    const { data: articleData, error: articleError } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (articleError) {
      alert(articleError.message);
      return;
    }

    const articleIds = (articleData || []).map((article) => article.id);

    let voteData = [];

    if (articleIds.length > 0) {
      const { data, error } = await supabase
        .from("article_votes")
        .select("*")
        .in("article_id", articleIds);

      if (!error) voteData = data || [];
    }

    setArticles(articleData || []);
    setVotes(voteData || []);
  };

  const getVoteStats = (articleId) => {
    const articleVotes = votes.filter((vote) => vote.article_id === articleId);

    return {
      likes: articleVotes.filter((vote) => vote.vote_type === "like").length,
      dislikes: articleVotes.filter((vote) => vote.vote_type === "dislike").length,
      myVote:
        articleVotes.find((vote) => vote.user_id === user?.id)?.vote_type ||
        null,
    };
  };

  const totalLikes = votes.filter((vote) => vote.vote_type === "like").length;
  const totalDislikes = votes.filter(
    (vote) => vote.vote_type === "dislike"
  ).length;

  const topLikedArticles = useMemo(() => {
    return [...articles]
      .map((article) => ({
        ...article,
        likeCount: getVoteStats(article.id).likes,
      }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5);
  }, [articles, votes, user]);

  const handleVote = async (articleId, voteType) => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    const existingVote = votes.find(
      (vote) => vote.article_id === articleId && vote.user_id === user.id
    );

    if (existingVote?.vote_type === voteType) {
      await supabase
        .from("article_votes")
        .delete()
        .eq("article_id", articleId)
        .eq("user_id", user.id);
    } else if (existingVote) {
      await supabase
        .from("article_votes")
        .update({ vote_type: voteType })
        .eq("article_id", articleId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("article_votes").insert([
        {
          article_id: articleId,
          user_id: user.id,
          vote_type: voteType,
        },
      ]);
    }

    fetchArticles();
  };

  const createArticle = async () => {
  if (!title.trim() || !content.trim()) {
    alert("Title and content are required.");
    return;
  }

  if (!user?.id) {
    alert("User not loaded. Please refresh.");
    return;
  }

  setIsPublishing(true);

  const articleTitle = title.trim();
  const articleContent = content.trim();
  const authorName = getDisplayName(user);

  const { error } = await supabase.from("articles").insert([
    {
      title: articleTitle,
      content: articleContent,
      user_id: user.id,
      author_name: authorName,
      avatar_url: getAvatarUrl(user),
      source_url: sourceUrl || null,
      likes: 0,
    },
  ]);

  setIsPublishing(false);

  if (error) {
    alert(error.message);
    return;
  }

  try {
    const emailRes = await fetch("/api/send-article-alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: articleTitle,
        content: articleContent,
        email: user.email,
        authorName: authorName,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailResult.success) {
      console.error("Article email failed:", emailResult.error);
    }
  } catch (emailError) {
    console.error("Article email request failed:", emailError);
  }

  setTitle("");
  setContent("");
  setSourceUrl("");
  fetchArticles();
  alert("Article published successfully!");
};

  const deleteArticle = async (id) => {
    if (!confirm("Delete this article permanently?")) return;

    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchArticles();
  };

  const importFromUrl = async () => {
    if (!importUrl.trim()) {
      alert("Please enter a valid URL.");
      return;
    }

    setIsImporting(true);

    let cleanUrl = importUrl.trim();

    if (!cleanUrl.startsWith("http")) {
      cleanUrl = "https://" + cleanUrl;
    }

    try {
      const response = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`
      );

      const result = await response.json();

      if (result.status === "success") {
        const data = result.data;

        setTitle(data.title || "Research Update");
        setContent(data.description || "No summary available.");
        setSourceUrl(cleanUrl);
        setImportUrl("");
      } else {
        throw new Error("Unable to fetch URL.");
      }
    } catch (error) {
      setSourceUrl(cleanUrl);
      setTitle("Imported Publication");
      setContent("Content extraction was restricted. Please review manually.");
      setImportUrl("");
    } finally {
      setIsImporting(false);
    }
  };

  const resendEmailNotification = async () => {
    if (!user?.email) return;

    setIsSending(true);

    try {
      await fetch("/api/send-login-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          deviceName:
            typeof window !== "undefined" ? navigator.userAgent : "Unknown",
        }),
      });

      alert("Security notification email sent.");
    } catch (error) {
      alert("Failed to send notification.");
    } finally {
      setIsSending(false);
    }
  };

  const copyShareLink = async (articleId) => {
    const link = `${baseUrl}/article/${articleId}`;

    try {
      await navigator.clipboard.writeText(link);
      alert("Shareable link copied.");
    } catch (error) {
      alert(link);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>⬢ ML Hub</div>

        <div style={styles.menu}>
  <button
    style={
      activeSection === "dashboard-section"
        ? styles.menuActive
        : styles.menuItem
    }
    onClick={() => scrollToSection("dashboard-section")}
  >
    Dashboard
  </button>

  <button
    style={
      activeSection === "articles-section"
        ? styles.menuActive
        : styles.menuItem
    }
    onClick={() => scrollToSection("articles-section")}
  >
    Articles
  </button>

  <button
    style={
      activeSection === "comments-section"
        ? styles.menuActive
        : styles.menuItem
    }
    onClick={() => scrollToSection("comments-section")}
  >
    Comments
  </button>

  <button
    style={
      activeSection === "top-likes-section"
        ? styles.menuActive
        : styles.menuItem
    }
    onClick={() => scrollToSection("top-likes-section")}
  >
    Top Likes
  </button>

  <button
    style={
      activeSection === "share-links-section"
        ? styles.menuActive
        : styles.menuItem
    }
    onClick={() => scrollToSection("share-links-section")}
  >
    Share Links
  </button>

  <button
    style={styles.menuItem}
    onClick={resendEmailNotification}
    disabled={isSending}
  >
    {isSending ? "Sending..." : "Security Email"}
  </button>
</div>

        <div style={styles.profileBox}>
          <div style={styles.sidebarUserRow}>
            <UserAvatar
              name={getDisplayName(user)}
              avatarUrl={getAvatarUrl(user)}
              size={48}
              getInitial={getInitial}
            />

            <div>
              <p style={styles.profileLabel}>Signed in as</p>
              <p style={styles.profileName}>{getDisplayName(user)}</p>
            </div>
          </div>

          <p style={styles.profileEmail}>{user?.email}</p>

          <label style={styles.avatarUploadLabel}>
            {isUploadingAvatar ? "Uploading..." : "Change Avatar"}
            <input
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              style={{ display: "none" }}
              disabled={isUploadingAvatar}
            />
          </label>

          <button onClick={signOut} style={styles.signOutBtn}>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <section id="dashboard-section" style={styles.header}>
          <h1 style={styles.pageTitle}>Dashboard</h1>
          <p style={styles.pageSubtitle}>
            Manage articles, comments, votes, shareable links, and notifications.
          </p>
        </section>

        <section id="top-likes-section" style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Articles</p>
            <h2 style={styles.statValue}>{articles.length}</h2>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Likes</p>
            <h2 style={styles.statValue}>{totalLikes}</h2>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Dislikes</p>
            <h2 style={styles.statValue}>{totalDislikes}</h2>
          </div>
        </section>

        <section style={styles.panel}>
          <p style={styles.sectionLabel}>Remote Data Acquisition</p>

          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="Paste article or research URL..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />

            <button
              onClick={importFromUrl}
              style={styles.primaryBtn}
              disabled={isImporting}
            >
              {isImporting ? "Fetching..." : "Fetch"}
            </button>
          </div>
        </section>

        <section style={styles.panel}>
          <p style={styles.sectionLabel}>New Publication</p>

          <input
            style={styles.titleInput}
            placeholder="Article title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            style={styles.textarea}
            placeholder="Write article content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {sourceUrl && <p style={styles.sourceTag}>Source linked</p>}

          <button
            onClick={createArticle}
            style={styles.publishBtn}
            disabled={isPublishing}
          >
            {isPublishing ? "Publishing..." : "Publish Article"}
          </button>
        </section>

        <section id="share-links-section" style={styles.panel}>
          <p style={styles.sectionLabel}>Share Links</p>

          {articles.length === 0 ? (
            <p style={styles.emptyText}>No articles available to share.</p>
          ) : (
            articles.map((article) => (
              <div key={article.id} style={styles.shareRow}>
                <span style={styles.shareTitle}>{article.title}</span>
                <button
                  style={styles.shareBtn}
                  onClick={() => copyShareLink(article.id)}
                >
                  Copy Link
                </button>
              </div>
            ))
          )}
        </section>

        <section style={styles.panel}>
          <p style={styles.sectionLabel}>Top Liked Articles</p>

          {topLikedArticles.length === 0 ? (
            <p style={styles.emptyText}>No top articles yet.</p>
          ) : (
            topLikedArticles.map((article) => (
              <div key={article.id} style={styles.topArticleRow}>
                <span>{article.title}</span>
                <strong>{article.likeCount} likes</strong>
              </div>
            ))
          )}
        </section>

        <section id="articles-section">
          <p style={styles.sectionLabel}>Global Feed</p>

          {articles.length === 0 && (
            <div style={styles.panel}>
              <p style={styles.emptyText}>No articles yet. Publish one above.</p>
            </div>
          )}

          {articles.map((article) => {
            const stats = getVoteStats(article.id);
            const articleAuthor = article.author_name || "Anonymous User";
            const articleAvatar = article.avatar_url || null;

            return (
              <article key={article.id} style={styles.articleCard}>
                <div style={styles.articleHeader}>
                  <div style={styles.articleAuthorRow}>
                    <UserAvatar
                      name={articleAuthor}
                      avatarUrl={articleAvatar}
                      size={48}
                      getInitial={getInitial}
                    />

                    <div>
                      <h2 style={styles.articleTitle}>{article.title}</h2>
                      <p style={styles.articleMeta}>
                        Posted by <strong>{articleAuthor}</strong> •{" "}
                        {formatDateTime(article.created_at)}
                      </p>
                    </div>
                  </div>

                  {article.user_id === user?.id && (
                    <button
                      onClick={() => deleteArticle(article.id)}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <p style={styles.articleContent}>{article.content}</p>

                <div style={styles.articleActions}>
                  <div style={styles.voteGroup}>
                    <button
                      onClick={() => handleVote(article.id, "like")}
                      style={
                        stats.myVote === "like"
                          ? styles.voteActive
                          : styles.voteBtn
                      }
                    >
                      Like {stats.likes}
                    </button>

                    <button
                      onClick={() => handleVote(article.id, "dislike")}
                      style={
                        stats.myVote === "dislike"
                          ? styles.dislikeActive
                          : styles.voteBtn
                      }
                    >
                      Dislike {stats.dislikes}
                    </button>

                    <button
                      onClick={() => copyShareLink(article.id)}
                      style={styles.shareBtn}
                    >
                      Share
                    </button>
                  </div>

                  {article.source_url && (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.sourceLink}
                    >
                      Original Source
                    </a>
                  )}
                </div>

                <div id="comments-section">
                  <CommentSection
                    articleId={article.id}
                    user={user}
                    getDisplayName={getDisplayName}
                    getAvatarUrl={getAvatarUrl}
                    getInitial={getInitial}
                    formatDateTime={formatDateTime}
                  />
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function UserAvatar({ name, avatarUrl, size = 40, getInitial }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          ...styles.avatarImage,
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...styles.avatarFallback,
        width: size,
        height: size,
        fontSize: size >= 44 ? "1rem" : "0.9rem",
      }}
    >
      {getInitial(name)}
    </div>
  );
}

function CommentSection({
  articleId,
  user,
  getDisplayName,
  getAvatarUrl,
  getInitial,
  formatDateTime,
}) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setComments(data || []);
  };

  const addComment = async () => {
    if (!text.trim()) return;

    if (!user) {
      alert("Please login first.");
      return;
    }

    const { error } = await supabase.from("comments").insert([
      {
        article_id: articleId,
        text: text.trim(),
        user_id: user.id,
        username: getDisplayName(user),
        avatar_url: getAvatarUrl(user),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    fetchComments();
  };

  return (
    <div style={styles.commentBox}>
      <div style={styles.commentInputRow}>
        <UserAvatar
          name={getDisplayName(user)}
          avatarUrl={getAvatarUrl(user)}
          size={38}
          getInitial={getInitial}
        />

        <input
          style={styles.commentInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
        />

        <button onClick={addComment} style={styles.commentBtn}>
          Post
        </button>
      </div>

      {comments.map((comment) => (
        <ReplySection
          key={comment.id}
          comment={comment}
          user={user}
          getDisplayName={getDisplayName}
          getAvatarUrl={getAvatarUrl}
          getInitial={getInitial}
          formatDateTime={formatDateTime}
        />
      ))}
    </div>
  );
}

function ReplySection({
  comment,
  user,
  getDisplayName,
  getAvatarUrl,
  getInitial,
  formatDateTime,
}) {
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from("replies")
      .select("*")
      .eq("comment_id", comment.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setReplies(data || []);
  };

  const addReply = async () => {
    if (!text.trim()) return;

    if (!user) {
      alert("Please login first.");
      return;
    }

    const { error } = await supabase.from("replies").insert([
      {
        comment_id: comment.id,
        text: text.trim(),
        user_id: user.id,
        username: getDisplayName(user),
        avatar_url: getAvatarUrl(user),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    setOpen(false);
    fetchReplies();
  };

  const commentName = comment.username || "Anonymous User";
  const commentAvatar = comment.avatar_url || null;

  return (
    <div style={styles.commentItem}>
      <div style={styles.commentCard}>
        <UserAvatar
          name={commentName}
          avatarUrl={commentAvatar}
          size={36}
          getInitial={getInitial}
        />

        <div style={styles.commentContentWrap}>
          <div style={styles.commentBubble}>
            <div style={styles.commentTopLine}>
              <strong style={styles.commentName}>{commentName}</strong>
              <span style={styles.commentTime}>
                {formatDateTime(comment.created_at)}
              </span>
            </div>

            <p style={styles.commentText}>{comment.text}</p>
          </div>

          <button onClick={() => setOpen(!open)} style={styles.replyBtn}>
            Reply
          </button>

          {replies.map((reply) => {
            const replyName = reply.username || "Anonymous User";
            const replyAvatar = reply.avatar_url || null;

            return (
              <div key={reply.id} style={styles.replyItem}>
                <UserAvatar
                  name={replyName}
                  avatarUrl={replyAvatar}
                  size={30}
                  getInitial={getInitial}
                />

                <div style={styles.replyBubble}>
                  <div style={styles.commentTopLine}>
                    <strong style={styles.commentName}>{replyName}</strong>
                    <span style={styles.commentTime}>
                      {formatDateTime(reply.created_at)}
                    </span>
                  </div>

                  <p style={styles.commentText}>{reply.text}</p>
                </div>
              </div>
            );
          })}

          {open && (
            <div style={styles.replyInputRow}>
              <input
                style={styles.replyInput}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a reply..."
              />

              <button onClick={addReply} style={styles.replySendBtn}>
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "#f6f9ff",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#1e293b",
  },

  sidebar: {
    width: "260px",
    backgroundColor: "#0f1f3d",
    color: "#e5eefc",
    padding: "24px 22px",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    overflowY: "auto",
  },

  brand: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "34px",
    color: "#ffffff",
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  menuItem: {
    backgroundColor: "transparent",
    color: "#cbd5e1",
    border: "none",
    padding: "13px 14px",
    textAlign: "left",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "0.92rem",
    fontWeight: "400",
  },

  menuActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "13px 14px",
    textAlign: "left",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "0.92rem",
    fontWeight: "500",
  },

  profileBox: {
    marginTop: "auto",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: "16px",
    borderRadius: "16px",
  },

  sidebarUserRow: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  profileLabel: {
    margin: 0,
    fontSize: "0.8rem",
    color: "#93c5fd",
    fontWeight: "400",
  },

  profileName: {
    margin: "3px 0 0",
    color: "#ffffff",
    fontSize: "0.9rem",
    fontWeight: "600",
  },

  profileEmail: {
    fontSize: "0.8rem",
    wordBreak: "break-all",
    fontWeight: "400",
    color: "#cbd5e1",
    marginTop: "10px",
  },

  avatarUploadLabel: {
    display: "block",
    textAlign: "center",
    marginBottom: "10px",
    padding: "10px",
    borderRadius: "12px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
  },

  signOutBtn: {
    width: "100%",
    padding: "11px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "500",
  },

  main: {
    marginLeft: "260px",
    width: "calc(100% - 260px)",
    padding: "34px",
  },

  header: {
    backgroundColor: "#ffffff",
    padding: "28px",
    borderRadius: "20px",
    border: "1px solid #dbeafe",
    marginBottom: "22px",
    boxShadow: "0 8px 24px rgba(37, 99, 235, 0.06)",
    scrollMarginTop: "30px",
  },

  pageTitle: {
    margin: 0,
    fontSize: "1.85rem",
    fontWeight: "500",
    color: "#0f172a",
  },

  pageSubtitle: {
    marginTop: "8px",
    fontSize: "0.95rem",
    color: "#64748b",
    fontWeight: "400",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "22px",
    scrollMarginTop: "30px",
  },

  statCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.04)",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "0.85rem",
    fontWeight: "400",
  },

  statValue: {
    margin: "8px 0 0",
    fontSize: "1.8rem",
    fontWeight: "500",
    color: "#1d4ed8",
  },

  panel: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "22px",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.04)",
    scrollMarginTop: "30px",
  },

  sectionLabel: {
    fontSize: "0.82rem",
    color: "#2563eb",
    fontWeight: "500",
    marginBottom: "14px",
    letterSpacing: "0.3px",
  },

  row: {
    display: "flex",
    gap: "10px",
  },

  input: {
    flex: 1,
    padding: "13px 15px",
    borderRadius: "12px",
    border: "1px solid #cfe0ff",
    outline: "none",
    fontSize: "0.95rem",
    fontWeight: "400",
  },

  primaryBtn: {
    padding: "0 22px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "500",
  },

  titleInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cfe0ff",
    borderRadius: "12px",
    padding: "13px 15px",
    marginBottom: "12px",
    outline: "none",
    fontSize: "1rem",
    fontWeight: "400",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "140px",
    border: "1px solid #cfe0ff",
    borderRadius: "12px",
    padding: "13px 15px",
    outline: "none",
    resize: "vertical",
    lineHeight: "1.6",
    fontSize: "0.95rem",
    fontWeight: "400",
  },

  sourceTag: {
    color: "#2563eb",
    fontWeight: "500",
    fontSize: "0.85rem",
  },

  publishBtn: {
    width: "100%",
    marginTop: "14px",
    padding: "13px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    fontSize: "0.95rem",
    fontWeight: "500",
    cursor: "pointer",
  },

  shareRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    padding: "14px",
    border: "1px solid #dbeafe",
    backgroundColor: "#f8fbff",
    borderRadius: "14px",
    marginBottom: "10px",
  },

  shareTitle: {
    fontSize: "0.95rem",
    fontWeight: "400",
    color: "#0f172a",
  },

  topArticleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "12px 0",
    borderBottom: "1px solid #e5efff",
    fontSize: "0.95rem",
    fontWeight: "400",
  },

  emptyText: {
    color: "#64748b",
    margin: 0,
    fontSize: "0.95rem",
  },

  articleCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "22px",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.04)",
    scrollMarginTop: "30px",
  },

  articleHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
  },

  articleAuthorRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  articleTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: "500",
    color: "#0f172a",
  },

  articleMeta: {
    marginTop: "6px",
    color: "#94a3b8",
    fontSize: "0.85rem",
    fontWeight: "400",
  },

  deleteBtn: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "none",
    padding: "9px 13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: "500",
    height: "fit-content",
  },

  articleContent: {
    color: "#475569",
    lineHeight: "1.75",
    whiteSpace: "pre-wrap",
    fontSize: "0.96rem",
    fontWeight: "400",
  },

  articleActions: {
    borderTop: "1px solid #e5efff",
    paddingTop: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },

  voteGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  voteBtn: {
    border: "1px solid #cfe0ff",
    backgroundColor: "#ffffff",
    color: "#475569",
    padding: "9px 13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "400",
  },

  voteActive: {
    border: "1px solid #2563eb",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "9px 13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
  },

  dislikeActive: {
    border: "1px solid #ef4444",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    padding: "9px 13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
  },

  shareBtn: {
    border: "1px solid #bfdbfe",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "9px 13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "500",
  },

  sourceLink: {
    color: "#2563eb",
    fontWeight: "500",
    textDecoration: "none",
    fontSize: "0.9rem",
  },

  avatarImage: {
    borderRadius: "999px",
    objectFit: "cover",
    border: "2px solid #dbeafe",
    flexShrink: 0,
  },

  avatarFallback: {
    borderRadius: "999px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    border: "2px solid #dbeafe",
    flexShrink: 0,
  },

  commentBox: {
    marginTop: "20px",
    backgroundColor: "#f8fbff",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid #e0ecff",
  },

  commentInputRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },

  commentInput: {
    flex: 1,
    padding: "11px 13px",
    borderRadius: "999px",
    border: "1px solid #cfe0ff",
    outline: "none",
    fontSize: "0.9rem",
    fontWeight: "400",
    backgroundColor: "#ffffff",
  },

  commentBtn: {
    padding: "11px 17px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "0.85rem",
    fontWeight: "500",
    cursor: "pointer",
  },

  commentItem: {
    marginTop: "12px",
  },

  commentCard: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
  },

  commentContentWrap: {
    flex: 1,
  },

  commentBubble: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbeafe",
    padding: "11px 14px",
    borderRadius: "15px",
    fontSize: "0.92rem",
    fontWeight: "400",
  },

  commentTopLine: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "4px",
  },

  commentName: {
    color: "#0f172a",
    fontSize: "0.88rem",
  },

  commentTime: {
    color: "#94a3b8",
    fontSize: "0.76rem",
  },

  commentText: {
    margin: 0,
    color: "#475569",
    lineHeight: "1.45",
    whiteSpace: "pre-wrap",
  },

  replyBtn: {
    border: "none",
    backgroundColor: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: "600",
    marginTop: "5px",
    marginLeft: "7px",
  },

  replyItem: {
    marginTop: "9px",
    marginLeft: "12px",
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },

  replyBubble: {
    flex: 1,
    backgroundColor: "#ffffff",
    border: "1px solid #dbeafe",
    padding: "10px 12px",
    borderRadius: "14px",
  },

  replyInputRow: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
    marginLeft: "12px",
  },

  replyInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "999px",
    border: "1px solid #cfe0ff",
    fontSize: "0.86rem",
    fontWeight: "400",
    outline: "none",
  },

  replySendBtn: {
    border: "none",
    borderRadius: "999px",
    padding: "0 14px",
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    fontSize: "0.85rem",
    fontWeight: "500",
    cursor: "pointer",
  },
};