function getToken() {
    return localStorage.getItem("token");
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

function getCurrentUserId() {
    return Number(getCurrentUser().id || 0);
}

if (!getToken() &&
    !location.pathname.endsWith("login.html") &&
    !location.pathname.endsWith("register.html")) {
    window.location.href = "login.html";
}

function authHeaders(extra = {}) {
    return {
        ...extra,
        Authorization: `Bearer ${getToken()}`
    };
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function initials(name) {
    return escapeHTML((name || "U").charAt(0).toUpperCase());
}

async function createPost() {
    const input = document.getElementById("postContent");
    const content = input.value.trim();

    if (!content) {
        alert("Write something first.");
        return;
    }

    const response = await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders({"Content-Type": "application/json"}),
        body: JSON.stringify({content})
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    input.value = "";
    updateCharCount();
    loadPosts();
}

async function loadPosts() {
    const container = document.getElementById("posts");
    if (!container) return;

    const response = await fetch("/api/posts", {headers: authHeaders()});

    if (response.status === 401 || response.status === 403) {
        logout();
        return;
    }

    const posts = await response.json();

    if (!posts.length) {
        container.innerHTML = `<div class="card empty">No posts yet. Be the first to post!</div>`;
        return;
    }

    container.innerHTML = posts.map(post => `
        <article class="card post">
            <div class="post-header">
                <div class="avatar">${post.profile_image ? `<img class="avatar-img" src="${escapeHTML(post.profile_image)}" alt="Profile">` : initials(post.username)}</div>
                <div>
                    <a class="username" href="profile.html?user=${post.user_id}">
                        ${escapeHTML(post.username)}
                    </a>
                    <div class="muted small">${new Date(post.created_at).toLocaleString()}</div>
                </div>
                ${Number(post.user_id) === getCurrentUserId()
                    ? `<button class="danger-link" onclick="deletePost(${post.id})">Delete</button>`
                    : ""}
            </div>

            <p class="post-content">${escapeHTML(post.content)}</p>

            <div class="post-actions">
                <button class="${post.liked ? "liked" : ""}" onclick="likePost(${post.id})">
                    ${post.liked ? "♥" : "♡"} Like (${post.likes_count})
                </button>
                <button onclick="showComments(${post.id})">
                    💬 Comments (${post.comments_count})
                </button>
            </div>

            <div id="comments-${post.id}" class="comments"></div>

            <div class="comment-box">
                <input id="comment-${post.id}" maxlength="500" placeholder="Write a comment...">
                <button onclick="addComment(${post.id})">Send</button>
            </div>
        </article>
    `).join("");
}

async function deletePost(postId) {
    if (!confirm("Delete this post?")) return;

    const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: authHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    loadPosts();
    if (document.getElementById("profilePosts")) {
        loadProfilePosts(getCurrentUserId());
    }
}

async function likePost(postId) {
    const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: authHeaders()
    });

    if (!response.ok) {
        const data = await response.json();
        alert(data.message);
        return;
    }

    loadPosts();
}

async function addComment(postId) {
    const input = document.getElementById(`comment-${postId}`);
    const comment = input.value.trim();

    if (!comment) return;

    const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: authHeaders({"Content-Type": "application/json"}),
        body: JSON.stringify({comment})
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    input.value = "";
    await showComments(postId);
    loadPosts();
}

async function showComments(postId) {
    const container = document.getElementById(`comments-${postId}`);
    if (!container) return;

    const response = await fetch(`/api/posts/${postId}/comments`, {
        headers: authHeaders()
    });

    const comments = await response.json();

    if (!comments.length) {
        container.innerHTML = `<div class="muted small">No comments yet.</div>`;
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="comment">
            <strong>${escapeHTML(comment.username)}</strong>
            <span>${escapeHTML(comment.comment)}</span>
        </div>
    `).join("");
}

async function loadUsers() {
    const container = document.getElementById("users");
    if (!container) return;

    const response = await fetch("/api/users", {headers: authHeaders()});
    const users = await response.json();

    if (!users.length) {
        container.innerHTML = `<p class="muted">No other users yet.</p>`;
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-info">
                <div class="avatar small-avatar">${user.profile_image ? `<img class="avatar-img" src="${escapeHTML(user.profile_image)}" alt="Profile">` : initials(user.username)}</div>
                <div>
                    <a class="username" href="profile.html?user=${user.id}">
                        ${escapeHTML(user.username)}
                    </a>
                    <div class="muted small">${user.followers_count} followers</div>
                </div>
            </div>
            <button onclick="followUser(${user.id})">
                ${user.following ? "Unfollow" : "Follow"}
            </button>
        </div>
    `).join("");
}

async function followUser(userId) {
    const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
        headers: authHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    loadUsers();
}

async function loadProfilePage() {
    const header = document.getElementById("profileHeader");
    if (!header) return;

    const params = new URLSearchParams(location.search);
    const requestedId = Number(params.get("user"));
    const userId = requestedId || getCurrentUserId();

    const response = await fetch(`/api/users/${userId}`, {
        headers: authHeaders()
    });

    if (!response.ok) {
        header.innerHTML = `<div class="message error">Profile not found.</div>`;
        return;
    }

    const user = await response.json();
    const ownProfile = userId === getCurrentUserId();

    header.innerHTML = `
        <div class="profile-top">
            <div class="profile-avatar">
                ${user.profile_image
                    ? `<img src="${escapeHTML(user.profile_image)}" alt="Profile">`
                    : initials(user.username)}
            </div>
            <div>
                <h1>${escapeHTML(user.username)}</h1>
                <p class="muted">${escapeHTML(user.bio || "No bio yet.")}</p>
            </div>
        </div>

        <div class="stats">
            <span><strong>${user.followers_count}</strong> Followers</span>
            <span><strong>${user.following_count}</strong> Following</span>
        </div>

        ${!ownProfile ? `
            <button class="primary-btn"
                onclick="followUser(${user.id}); setTimeout(loadProfilePage, 300)">
                ${user.following ? "Unfollow" : "Follow"}
            </button>
        ` : ""}
    `;

    const form = document.getElementById("profileForm");
    const photoEditor = document.getElementById("photoEditor");

    if (form) {
        if (!ownProfile) {
            form.style.display = "none";
            if (photoEditor) photoEditor.style.display = "none";
        } else {
            document.getElementById("profileUsername").value = user.username;
            document.getElementById("profileBio").value = user.bio || "";

            form.onsubmit = async (e) => {
                e.preventDefault();

                const response = await fetch("/api/me", {
                    method: "PUT",
                    headers: authHeaders({"Content-Type": "application/json"}),
                    body: JSON.stringify({
                        username: document.getElementById("profileUsername").value,
                        bio: document.getElementById("profileBio").value
                    })
                });

                const data = await response.json();
                const message = document.getElementById("profileMessage");

                message.textContent = data.message;
                message.className = response.ok
                    ? "message success"
                    : "message error";

                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    const stored = getCurrentUser();
                    stored.username = document.getElementById("profileUsername").value;
                    localStorage.setItem("user", JSON.stringify(stored));
                    setTimeout(loadProfilePage, 300);
                }
            };
        }
    }

    const photoForm = document.getElementById("photoForm");

    if (photoForm) {
        if (!ownProfile) {
            photoForm.style.display = "none";
            if (photoEditor) photoEditor.style.display = "none";
        } else {
            photoForm.onsubmit = async (e) => {
                e.preventDefault();

                const fileInput = document.getElementById("profileImageFile");
                const message = document.getElementById("photoMessage");

                if (!fileInput.files.length) {
                    message.textContent = "Please select a photo.";
                    message.className = "message error";
                    return;
                }

                const formData = new FormData();
                formData.append("profileImage", fileInput.files[0]);

                const response = await fetch("/api/me/profile-photo", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: formData
                });

                const data = await response.json();
                message.textContent = data.message;
                message.className = response.ok
                    ? "message success"
                    : "message error";

                if (response.ok) {
                    fileInput.value = "";
                    setTimeout(loadProfilePage, 300);
                }
            };
        }
    }

    loadProfilePosts(userId);
}

async function loadProfilePosts(userId) {
    const container = document.getElementById("profilePosts");
    if (!container) return;

    const response = await fetch(`/api/users/${userId}/posts`, {
        headers: authHeaders()
    });

    const posts = await response.json();

    if (!posts.length) {
        container.innerHTML = `<div class="card empty">No posts yet.</div>`;
        return;
    }

    container.innerHTML = posts.map(post => `
        <article class="card post">
            <div class="post-header">
                <div class="avatar">${post.profile_image ? `<img class="avatar-img" src="${escapeHTML(post.profile_image)}" alt="Profile">` : initials(post.username)}</div>
                <div>
                    <strong>${escapeHTML(post.username)}</strong>
                    <div class="muted small">${new Date(post.created_at).toLocaleString()}</div>
                </div>
                ${Number(userId) === getCurrentUserId()
                    ? `<button class="danger-link" onclick="deletePost(${post.id})">Delete</button>`
                    : ""}
            </div>

            <p class="post-content">${escapeHTML(post.content)}</p>

            <div class="post-actions">
                <button class="${post.liked ? "liked" : ""}"
                    onclick="likeProfilePost(${post.id}, ${userId})">
                    ${post.liked ? "♥" : "♡"} Like (${post.likes_count})
                </button>
                <span>💬 ${post.comments_count}</span>
            </div>
        </article>
    `).join("");
}

async function likeProfilePost(postId, userId) {
    await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: authHeaders()
    });
    loadProfilePosts(userId);
}

function updateCharCount() {
    const input = document.getElementById("postContent");
    const counter = document.getElementById("charCount");
    if (input && counter) {
        counter.textContent = `${input.value.length} / 1000`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("postContent");

    if (input) {
        input.addEventListener("input", updateCharCount);
    }

    if (document.getElementById("posts")) loadPosts();
    if (document.getElementById("users")) loadUsers();
});