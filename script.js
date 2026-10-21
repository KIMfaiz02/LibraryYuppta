/*
 * script.js — Perpustakaan (client-side demo)
 * - Auth (localStorage)
 * - Role-based UI (admin/user)
 * - Persistent books via localStorage (add/delete)
 */

'use strict';

const DEFAULT_BOOKS = [
    { title: 'Matematika Dasar', author: 'John Doe', img: 'https://via.placeholder.com/150', stock: 3 },
    { title: 'Sejarah Dunia', author: 'Jane Smith', img: 'https://via.placeholder.com/150', stock: 3 }
];

let books = [];
let selectedCatalogGenre = '';

/* ---------- Storage helpers ---------- */
const DEFAULT_GENRES = ['Umum', 'Sains', 'Sejarah'];
let genres = [];

function saveBooks() {
    localStorage.setItem('books', JSON.stringify(books));
}

function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBooks(items) {
    const usedIds = new Set();
    return items.map(book => {
        let id = book.id || createId('book');
        while (usedIds.has(id)) id = createId('book');
        usedIds.add(id);
        const stock = Number(book.stock);
        return {
            ...book,
            id,
            stock: Number.isInteger(stock) && stock >= 0 ? stock : 3
        };
    });
}

function loadLoans() {
    try {
        const parsed = JSON.parse(localStorage.getItem('loans') || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveLoans(loans) {
    localStorage.setItem('loans', JSON.stringify(loans));
}

function loadBooks() {
    try {
        const parsed = JSON.parse(localStorage.getItem('books') || 'null');
        if (Array.isArray(parsed) && parsed.length) {
            books = normalizeBooks(parsed);
            saveBooks();
            return;
        }
    } catch (e) {
        // ignore
    }
    books = normalizeBooks(DEFAULT_BOOKS);
    saveBooks();
}

function countActiveLoans(book, loans = loadLoans()) {
    return loans.filter(loan => !loan.returnedAt && (loan.bookId ? loan.bookId === book.id : loan.title === book.title)).length;
}

function availableStock(book, loans = loadLoans()) {
    return Math.max(0, book.stock - countActiveLoans(book, loans));
}

function saveGenres() {
    localStorage.setItem('genres', JSON.stringify(genres));
}

function loadGenres() {
    try {
        const parsed = JSON.parse(localStorage.getItem('genres') || 'null');
        if (Array.isArray(parsed) && parsed.length) {
            genres = parsed;
            return;
        }
    } catch (e) {
        // ignore
    }
    genres = DEFAULT_GENRES.slice();
    saveGenres();
}

function deleteBook(idx) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') { showToast('Hanya admin yang dapat menghapus buku', true); return; }
    if (typeof idx !== 'number' || idx < 0 || idx >= books.length) return;
    if (countActiveLoans(books[idx]) > 0) {
        showToast('Buku yang masih dipinjam tidak dapat dihapus', true);
        return;
    }
    books.splice(idx, 1);
    saveBooks();
    renderBooks();
    showToast('Buku dihapus');
}

/* ---------- Genre management (admin) ---------- */
function addGenre(name) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') { showToast('Hanya admin yang dapat menambah genre', true); return false; }
    const nm = String(name || '').trim();
    if (!nm) { showToast('Nama genre kosong', true); return false; }
    if (genres.find(g => g.toLowerCase() === nm.toLowerCase())) { showToast('Genre sudah ada', true); return false; }
    genres.push(nm);
    saveGenres();
    populateGenreSelects();
    renderGenresAdmin();
    renderCatalogCategories();
    showToast('Genre ditambahkan');
    return true;
}

function deleteGenre(idx) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') { showToast('Hanya admin yang dapat menghapus genre', true); return; }
    if (typeof idx !== 'number' || idx < 0 || idx >= genres.length) return;
    const name = genres[idx];
    if (!confirm(`Hapus genre "${name}"?`)) return;
    genres.splice(idx, 1);
    if (selectedCatalogGenre.toLowerCase() === name.toLowerCase()) selectedCatalogGenre = '';
    saveGenres();
    populateGenreSelects();
    renderGenresAdmin();
    renderCatalogCategories();
    filterCatalogBooks();
    showToast('Genre dihapus');
}

function renderGenresAdmin() {
    const el = document.getElementById('genre-list');
    if (!el) return;
    el.innerHTML = '';
    genres.forEach((g, i) => {
        const item = document.createElement('div');
        item.className = 'genre-item';
        item.innerHTML = `${escapeHtml(g)} <button class="del" data-idx="${i}">×</button>`;
        el.appendChild(item);
    });
    // attach handlers
    el.querySelectorAll('button.del').forEach(b => b.addEventListener('click', function () { deleteGenre(Number(this.dataset.idx)); }));
}

function populateGenreSelects() {
    // add-book select
    const s = document.getElementById('new-genre');
    if (s) {
        s.innerHTML = '';
        genres.forEach(g => {
            const o = document.createElement('option');
            o.value = g; o.textContent = g; s.appendChild(o);
        });
    }
    // search filter
    const f = document.getElementById('genre-filter');
    if (f) {
        const sel = f.value || '';
        f.innerHTML = '<option value="">Semua Genre</option>';
        genres.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; f.appendChild(o); });
        f.value = sel;
    }
}

/* ---------- Utilities ---------- */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function createToast() {
    const el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
    return el;
}

function showToast(message, isError = false) {
    const t = document.getElementById('toast') || createToast();
    t.textContent = message;
    t.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

/* ---------- Auth (localStorage demo) ---------- */
function loadUsers() {
    try { return JSON.parse(localStorage.getItem('users') || '[]'); } catch (e) { return []; }
}

function saveUsers(u) {
    localStorage.setItem('users', JSON.stringify(u));
}

function ensureDemoAdmin() {
    const u = loadUsers();
    if (!u.find(x => x.email === 'admin@admin.com')) {
        u.push({ name: 'Admin', email: 'admin@admin.com', password: 'admin123', role: 'admin' });
        saveUsers(u);
    }
}

function registerUser({ name, email, password, role = 'user', nis = '', className = '' }) {
    const u = loadUsers();
    if (u.find(x => x.email === email)) return false;
    u.push({ name, email, password, role, nis, className, createdAt: new Date().toISOString() });
    saveUsers(u);
    return true;
}

function loginUser(email, password) {
    const u = loadUsers();
    const found = u.find(x => x.email === email && x.password === password);
    if (found) {
        localStorage.setItem('currentUser', JSON.stringify({
            name: found.name,
            email: found.email,
            role: found.role,
            nis: found.nis || '',
            className: found.className || ''
        }));
        updateHeader();
        return true;
    }
    return false;
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    updateHeader();
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (e) { return null; }
}

/* ---------- Header & Role-based UI ---------- */
function updateHeader() {
    const navAuth = document.getElementById('nav-auth');
    const user = getCurrentUser();

    if (navAuth && navAuth.parentElement) {
        let profileItem = document.getElementById('nav-profile');
        if (!profileItem) {
            profileItem = document.createElement('li');
            profileItem.id = 'nav-profile';
            profileItem.innerHTML = '<a href="profile.html">Profil</a>';
            navAuth.parentElement.insertBefore(profileItem, navAuth);
        }
        profileItem.hidden = !user;

        let adminItem = document.getElementById('nav-admin');
        if (!adminItem) {
            adminItem = document.createElement('li');
            adminItem.id = 'nav-admin';
            adminItem.innerHTML = '<a href="admin.html">Laporan</a>';
            navAuth.parentElement.insertBefore(adminItem, profileItem);
        }
        adminItem.hidden = !user || user.role !== 'admin';
    }

    if (navAuth) {
        if (user) {
            navAuth.innerHTML = `<span class="user-greet">Halo, ${escapeHtml(user.name)} (${escapeHtml(user.role)})</span> <a href="#" id="logout-link">Keluar</a>`;
            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    logoutUser();
                    showToast('Anda telah keluar');
                    setTimeout(() => { window.location = 'index.html'; }, 400);
                });
            }
        } else {
            navAuth.innerHTML = `<a href="login.html">Masuk / Daftar</a>`;
        }
    }

    const adminControls = document.getElementById('admin-controls');
    if (adminControls) {
        adminControls.style.display = (user && user.role === 'admin') ? 'flex' : 'none';
    }
}

/* ---------- Rendering (search & katalog) ---------- */
function renderResults(results, query) {
    const hasil = document.getElementById('hasil');
    if (!hasil) return;

    if (!results || results.length === 0) {
        hasil.innerHTML = query ? `<p>Tidak ada buku ditemukan untuk "${escapeHtml(query)}".</p>` : '<p>Belum ada buku di katalog.</p>';
        return;
    }

    const label = query ? `Hasil pencarian untuk "${escapeHtml(query)}": (${results.length})` : `Semua buku: (${results.length})`;
    let html = `<p>${label}</p><div class="results">`;

    results.forEach(b => {
        html += `
            <div class="result">
                <img src="${escapeHtml(b.img || 'https://via.placeholder.com/150')}" alt="${escapeHtml(b.title)}" width="80">
                <div class="meta">
                    <h4>${escapeHtml(b.title)} <span class="genre-badge">${escapeHtml(b.genre || 'Umum')}</span></h4>
                    <p>Penulis: ${escapeHtml(b.author)}</p>
                </div>
            </div>`;
    });

    html += '</div>';
    hasil.innerHTML = html;
}

function cariBuku() {
    const el = document.getElementById('search');
    const f = document.getElementById('genre-filter');
    if (!el) return;
    const query = el.value.trim();
    const q = query.toLowerCase();
    const genre = f ? (f.value || '') : '';
    const matches = books.filter(b => {
        const matchesQuery = !q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q);
        const matchesGenre = !genre || (b.genre || '').toLowerCase() === genre.toLowerCase();
        return matchesQuery && matchesGenre;
    });
    const sort = document.getElementById('search-sort');
    if (sort && sort.value === 'title') matches.sort((a, b) => a.title.localeCompare(b.title, 'id'));
    renderResults(matches, query);
}

function renderCatalogCategories() {
    const container = document.getElementById('catalog-category-list');
    if (!container) return;

    const categories = ['Semua', ...genres];
    container.innerHTML = categories.map(category => {
        const value = category === 'Semua' ? '' : category;
        const isActive = value === selectedCatalogGenre;
        return `<button type="button" class="category-filter${isActive ? ' active' : ''}" data-category="${escapeHtml(value)}" aria-pressed="${isActive}">${escapeHtml(category)}</button>`;
    }).join('');

    container.querySelectorAll('[data-category]').forEach(button => {
        button.addEventListener('click', () => {
            selectedCatalogGenre = button.dataset.category;
            renderCatalogCategories();
            filterCatalogBooks();
        });
    });
}

function filterCatalogBooks() {
    const container = document.getElementById('book-list');
    if (!container) return;
    container.querySelectorAll('.buku.card').forEach(card => {
        card.hidden = Boolean(selectedCatalogGenre) && card.dataset.genre.toLowerCase() !== selectedCatalogGenre.toLowerCase();
    });
}

function renderBooks() {
    const container = document.getElementById('book-list');
    if (!container) return;

    const loans = loadLoans();
    const current = getCurrentUser();
    const isAdmin = current && current.role === 'admin';
    let html = '';
    books.forEach((b, idx) => {
        const available = availableStock(b, loans);
        const editGenres = [...new Set([...genres, b.genre || 'Umum'])];
        html += `
            <article class="buku card" data-genre="${escapeHtml(b.genre || 'Umum')}">
                <img src="${escapeHtml(b.img || 'https://via.placeholder.com/150')}" alt="${escapeHtml(b.title)}">
                <h3>${escapeHtml(b.title)}</h3>
                <p>Penulis: ${escapeHtml(b.author)}</p>
                <div class="meta-extra"><span class="genre-badge">${escapeHtml(b.genre || 'Umum')}</span></div>
                <p class="stock-label"><strong>${available}</strong> dari ${b.stock} eksemplar tersedia</p>
                <div class="card-actions">
                    <button class="btn-primary" data-idx="${idx}" ${available === 0 ? 'disabled' : ''}>${available === 0 ? 'Stok habis' : 'Pinjam'}</button>
                    <button class="btn-secondary" data-edit-idx="${idx}" hidden>Edit</button>
                    <button class="btn-danger" data-del-idx="${idx}" hidden>Hapus</button>
                </div>
                <form class="book-edit-form" data-edit-form="${idx}" hidden>
                    <label>Judul<input name="title" value="${escapeHtml(b.title)}" required></label>
                    <label>Penulis<input name="author" value="${escapeHtml(b.author)}" required></label>
                    <label>Genre<select name="genre">${editGenres.map(genre => `<option value="${escapeHtml(genre)}" ${genre === (b.genre || 'Umum') ? 'selected' : ''}>${escapeHtml(genre)}</option>`).join('')}</select></label>
                    <label>Stok total<input name="stock" type="number" min="0" step="1" value="${b.stock}" required></label>
                    <label>URL sampul<input name="img" type="url" value="${escapeHtml(b.img || '')}"></label>
                    <div class="edit-actions"><button type="submit" class="btn-primary">Simpan</button><button type="button" class="btn-secondary" data-cancel-edit> Batal</button></div>
                </form>
            </article>`;
    });

    container.innerHTML = html;
    renderCatalogCategories();
    filterCatalogBooks();

    // Pinjam handlers
    container.querySelectorAll('button[data-idx]').forEach(btn => {
        btn.addEventListener('click', function () {
            const user = getCurrentUser();
            if (!user) {
                showToast('Silakan masuk terlebih dahulu untuk meminjam', true);
                setTimeout(() => window.location = 'login.html', 700);
                return;
            }
            borrowBook(Number(this.dataset.idx));
        });
    });

    // Delete handlers (admin only)
    container.querySelectorAll('button[data-del-idx]').forEach(btn => {
        btn.addEventListener('click', function () {
            const idx = Number(this.dataset.delIdx);
            if (!confirm('Hapus buku ini?')) return;
            deleteBook(idx);
        });
    });

    container.querySelectorAll('[data-edit-idx]').forEach(btn => {
        btn.hidden = !isAdmin;
        btn.addEventListener('click', () => {
            const form = container.querySelector(`[data-edit-form="${btn.dataset.editIdx}"]`);
            form.hidden = !form.hidden;
        });
    });
    container.querySelectorAll('[data-del-idx]').forEach(btn => { btn.hidden = !isAdmin; });
    container.querySelectorAll('.book-edit-form').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            const values = new FormData(form);
            updateBook(Number(form.dataset.editForm), {
                title: values.get('title'),
                author: values.get('author'),
                genre: values.get('genre'),
                stock: Number(values.get('stock')),
                img: values.get('img') || 'https://via.placeholder.com/150'
            });
        });
        form.querySelector('[data-cancel-edit]').addEventListener('click', () => { form.hidden = true; });
    });
}

function updateBook(idx, changes) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') { showToast('Hanya admin yang dapat mengedit buku', true); return; }
    const book = books[idx];
    if (!book) return;
    if (!changes.title.trim() || !changes.author.trim() || !Number.isInteger(changes.stock) || changes.stock < 0) {
        showToast('Periksa judul, penulis, dan stok buku', true);
        return;
    }
    if (changes.stock < countActiveLoans(book)) {
        showToast('Stok tidak boleh kurang dari buku yang sedang dipinjam', true);
        return;
    }
    books[idx] = { ...book, ...changes };
    saveBooks();
    renderBooks();
    showToast('Perubahan buku disimpan');
}

function borrowBook(idx) {
    const user = getCurrentUser();
    const book = books[idx];
    if (!user) {
        showToast('Silakan masuk terlebih dahulu untuk meminjam', true);
        return;
    }
    if (!book) return;

    const loans = loadLoans();
    const alreadyBorrowed = loans.some(loan => loan.email === user.email && !loan.returnedAt && (loan.bookId ? loan.bookId === book.id : loan.title === book.title));
    if (alreadyBorrowed) {
        showToast('Buku ini masih dalam peminjaman Anda', true);
        return;
    }
    if (availableStock(book, loans) < 1) {
        showToast('Stok buku sedang habis dipinjam', true);
        return;
    }

    const borrowedAt = new Date();
    const dueAt = new Date(borrowedAt);
    dueAt.setDate(dueAt.getDate() + 14);
    loans.push({
        id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        bookId: book.id,
        email: user.email,
        userName: user.name,
        title: book.title,
        author: book.author,
        borrowedAt: borrowedAt.toISOString(),
        dueAt: dueAt.toISOString(),
        returnedAt: null
    });
    saveLoans(loans);
    renderBooks();
    showToast('Buku berhasil dipinjam. Riwayat tersimpan di profil.');
}

function returnBook(id) {
    const user = getCurrentUser();
    if (!user) return;
    const loans = loadLoans();
    const loan = loans.find(item => item.id === id && item.email === user.email && !item.returnedAt);
    if (!loan) return;
    loan.returnedAt = new Date().toISOString();
    saveLoans(loans);
    renderProfile();
    renderBooks();
    renderAdminDashboard();
    showToast('Buku berhasil dikembalikan');
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function renderProfile() {
    const profile = document.getElementById('profile-details');
    const history = document.getElementById('loan-history');
    const sidebarName = document.getElementById('profile-sidebar-name');
    const sidebarAvatar = document.getElementById('profile-sidebar-avatar');
    const sidebarRole = document.getElementById('profile-sidebar-role');
    const summary = document.getElementById('profile-summary-cards');
    if (!profile && !history && !sidebarName && !sidebarAvatar && !sidebarRole && !summary) return;

    const user = getCurrentUser();
    const emptyState = '<p class="empty-state">Masuk untuk melihat profil dan riwayat peminjaman.</p>';
    if (!user) {
        if (profile) profile.innerHTML = `${emptyState}<a class="btn-primary" href="login.html">Masuk</a>`;
        if (history) history.innerHTML = '';
        if (sidebarName) sidebarName.textContent = 'Akun Pengguna';
        if (sidebarAvatar) sidebarAvatar.textContent = '?';
        if (sidebarRole) sidebarRole.textContent = 'Anggota';
        if (summary) summary.innerHTML = '<p class="empty-state">Masuk untuk melihat statistik peminjaman.</p>';
        return;
    }

    const loans = loadLoans().filter(loan => loan.email === user.email).sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
    const activeLoans = loans.filter(loan => !loan.returnedAt);
    if (sidebarName) sidebarName.textContent = user.name || 'Pengguna';
    if (sidebarAvatar) sidebarAvatar.textContent = (user.name || '?').trim().charAt(0).toUpperCase();
    if (sidebarRole) sidebarRole.textContent = user.role === 'admin' ? 'Administrator' : 'Anggota';
    if (summary) {
        summary.innerHTML = `
            <article><strong>${loans.length}</strong><span>Total Peminjaman</span></article>
            <article><strong>${activeLoans.length}</strong><span>Sedang Dipinjam</span></article>
            <article><strong>${loans.length - activeLoans.length}</strong><span>Telah Dikembalikan</span></article>`;
    }
    if (profile) {
        profile.innerHTML = `
            <div class="profile-avatar" aria-hidden="true">${escapeHtml((user.name || '?').trim().charAt(0).toUpperCase())}</div>
            <div class="profile-info">
                <span class="eyebrow">Akun ${escapeHtml(user.role || 'user')}</span>
                <h2>${escapeHtml(user.name || 'Pengguna')}</h2>
                <p>${escapeHtml(user.email || '')}</p>
                ${user.nis ? `<p>NIS: ${escapeHtml(user.nis)}</p>` : ''}
                ${user.className ? `<p>Kelas: ${escapeHtml(user.className)}</p>` : ''}
            </div>
            <div class="profile-stats">
                <div><strong>${activeLoans.length}</strong><span>Sedang dipinjam</span></div>
                <div><strong>${loans.length}</strong><span>Total peminjaman</span></div>
            </div>`;
    }

    if (!history) return;
    if (!loans.length) {
        history.innerHTML = '<p class="empty-state">Belum ada riwayat peminjaman. Jelajahi katalog untuk meminjam buku.</p><a class="btn-secondary" href="katalog.html">Buka katalog</a>';
        return;
    }

    history.innerHTML = loans.map(loan => `
        <article class="loan-item">
            <div class="loan-copy">
                <h3>${escapeHtml(loan.title)}</h3>
                <p>Penulis: ${escapeHtml(loan.author || '-')}</p>
                <p>Dipinjam ${formatDate(loan.borrowedAt)}${loan.dueAt ? ` · Tenggat ${formatDate(loan.dueAt)}` : ''}</p>
                ${loan.returnedAt ? `<p>Dikembalikan ${formatDate(loan.returnedAt)}</p>` : ''}
            </div>
            <div class="loan-status ${loan.returnedAt ? 'is-returned' : 'is-active'}">${loan.returnedAt ? 'Dikembalikan' : 'Dipinjam'}</div>
            ${loan.returnedAt ? '' : `<button class="btn-secondary" data-return-id="${escapeHtml(loan.id)}">Kembalikan</button>`}
        </article>`).join('');

    history.querySelectorAll('[data-return-id]').forEach(button => {
        button.addEventListener('click', () => returnBook(button.dataset.returnId));
    });
}

function renderAdminDashboard() {
    const workspace = document.getElementById('admin-workspace');
    if (!workspace) return;
    const accessDenied = document.getElementById('admin-access-denied');
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        workspace.hidden = true;
        if (accessDenied) accessDenied.hidden = false;
        return;
    }

    workspace.hidden = false;
    if (accessDenied) accessDenied.hidden = true;
    const users = loadUsers().filter(member => member.role !== 'admin');
    const loans = loadLoans().sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
    const activeLoans = loans.filter(loan => !loan.returnedAt);
    const returnedLoans = loans.filter(loan => loan.returnedAt);
    const totalCopies = books.reduce((total, book) => total + book.stock, 0);
    const stats = document.getElementById('admin-stats');
    if (stats) {
        stats.innerHTML = `
            <article class="admin-stat"><span>Total anggota</span><strong>${users.length}</strong><small>akun pengguna terdaftar</small></article>
            <article class="admin-stat"><span>Total judul buku</span><strong>${books.length}</strong><small>${totalCopies} eksemplar dalam koleksi</small></article>
            <article class="admin-stat"><span>Sedang dipinjam</span><strong>${activeLoans.length}</strong><small>belum dikembalikan</small></article>
            <article class="admin-stat"><span>Sudah dikembalikan</span><strong>${returnedLoans.length}</strong><small>transaksi selesai</small></article>`;
    }

    renderAdminUserAccounts(users);

    const filter = document.getElementById('report-filter');
    const filterValue = filter ? filter.value : 'all';
    const visibleLoans = loans.filter(loan => {
        if (filterValue === 'active') return !loan.returnedAt;
        if (filterValue === 'returned') return Boolean(loan.returnedAt);
        return true;
    });
    const reportBody = document.getElementById('loan-report-body');
    if (!reportBody) return;
    if (!visibleLoans.length) {
        reportBody.innerHTML = '<tr><td class="report-empty" colspan="6">Belum ada transaksi untuk ditampilkan.</td></tr>';
        return;
    }

    reportBody.innerHTML = visibleLoans.map(loan => {
        const memberName = loan.userName || users.find(member => member.email === loan.email)?.name || loan.email || '-';
        const status = loan.returnedAt ? 'Dikembalikan' : 'Dipinjam';
        return `<tr>
            <td><strong>${escapeHtml(loan.title || '-')}</strong><span>${escapeHtml(loan.author || '-')}</span></td>
            <td>${escapeHtml(memberName)}<span>${escapeHtml(loan.email || '-')}</span></td>
            <td>${formatDate(loan.borrowedAt)}</td>
            <td>${formatDate(loan.dueAt)}</td>
            <td>${loan.returnedAt ? formatDate(loan.returnedAt) : '-'}</td>
            <td><span class="loan-status ${loan.returnedAt ? 'is-returned' : 'is-active'}">${status}</span></td>
        </tr>`;
    }).join('');
}

function renderAdminUserAccounts(users = loadUsers().filter(member => member.role !== 'admin')) {
    const body = document.getElementById('user-account-body');
    if (!body) return;

    if (!users.length) {
        body.innerHTML = '<tr><td class="report-empty" colspan="7">Belum ada akun pengguna terdaftar.</td></tr>';
        return;
    }

    const sortedUsers = [...users].sort((a, b) => {
        const dateA = Date.parse(a.createdAt || '');
        const dateB = Date.parse(b.createdAt || '');
        return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
    });

    body.innerHTML = sortedUsers.map(member => `
        <tr>
            <td><strong>${escapeHtml(member.name || '-')}</strong></td>
            <td>${escapeHtml(member.email || '-')}</td>
            <td>${escapeHtml(member.nis || '-')}</td>
            <td>${escapeHtml(member.className || '-')}</td>
            <td>${member.createdAt ? formatDate(member.createdAt) : 'Tidak tercatat'}</td>
            <td>
                <details class="account-password-reset">
                    <summary class="btn-secondary">Atur password baru</summary>
                    <form class="account-password-form" data-account-email="${escapeHtml(member.email || '')}">
                        <label>Password baru
                            <input type="password" name="new-password" minlength="8" autocomplete="new-password" required>
                        </label>
                        <label>Ulangi password baru
                            <input type="password" name="confirm-password" minlength="8" autocomplete="new-password" required>
                        </label>
                        <button class="btn-primary" type="submit">Simpan password</button>
                    </form>
                </details>
            </td>
            <td><button type="button" class="btn-danger account-delete-button" data-delete-email="${escapeHtml(member.email || '')}" data-delete-name="${escapeHtml(member.name || 'pengguna')}">Hapus akun</button></td>
        </tr>`).join('');

    body.querySelectorAll('.account-delete-button').forEach(button => {
        button.addEventListener('click', () => {
            const currentUser = getCurrentUser();
            if (!currentUser || currentUser.role !== 'admin') {
                showToast('Hanya admin yang dapat menghapus akun pengguna', true);
                return;
            }

            const email = button.dataset.deleteEmail;
            const accounts = loadUsers();
            const account = accounts.find(member => member.email === email && member.role !== 'admin');
            if (!account) {
                showToast('Akun pengguna tidak ditemukan', true);
                renderAdminDashboard();
                return;
            }

            const hasActiveLoans = loadLoans().some(loan => loan.email === email && !loan.returnedAt);
            if (hasActiveLoans) {
                showToast('Akun belum dapat dihapus karena masih memiliki peminjaman aktif', true);
                return;
            }

            const confirmed = confirm(`Hapus akun ${account.name || 'pengguna'} (${account.email})? Riwayat peminjaman tetap disimpan.`);
            if (!confirmed) return;

            saveUsers(accounts.filter(member => member.email !== email));
            renderAdminDashboard();
            showToast('Akun pengguna berhasil dihapus');
        });
    });

    body.querySelectorAll('.account-password-form').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            const currentUser = getCurrentUser();
            if (!currentUser || currentUser.role !== 'admin') {
                showToast('Hanya admin yang dapat mengatur password pengguna', true);
                return;
            }

            const values = new FormData(form);
            const newPassword = String(values.get('new-password') || '');
            const confirmPassword = String(values.get('confirm-password') || '');
            if (newPassword.length < 8) {
                showToast('Password baru harus memiliki minimal 8 karakter', true);
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast('Password baru tidak cocok', true);
                return;
            }

            const accounts = loadUsers();
            const account = accounts.find(member => member.email === form.dataset.accountEmail && member.role !== 'admin');
            if (!account) {
                showToast('Akun pengguna tidak ditemukan', true);
                renderAdminDashboard();
                return;
            }

            account.password = newPassword;
            saveUsers(accounts);
            renderAdminDashboard();
            showToast('Password baru berhasil disimpan. Berikan kepada pengguna melalui cara yang aman.');
        });
    });
}

/* ---------- Admin controls ---------- */
function initAdminControls() {
    const showBtn = document.getElementById('show-add-book');
    const form = document.getElementById('add-book-form');
    if (!showBtn || !form) return;

    showBtn.addEventListener('click', () => {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
        showBtn.setAttribute('aria-expanded', String(form.style.display !== 'none'));
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user || user.role !== 'admin') {
            showToast('Hanya admin yang dapat menambah buku', true);
            return;
        }
        const title = document.getElementById('new-title').value.trim();
        const author = document.getElementById('new-author').value.trim();
        const img = document.getElementById('new-img').value.trim() || 'https://via.placeholder.com/150';
        const genre = document.getElementById('new-genre').value || 'Umum';
        const stock = Number(document.getElementById('new-stock').value);

        if (!title || !author || !Number.isInteger(stock) || stock < 0) {
            showToast('Judul, penulis, dan stok yang valid wajib diisi', true);
            return;
        }

        books.push({ id: createId('book'), title, author, img, genre, stock });
        saveBooks();
        renderBooks();
        renderAdminDashboard();
        form.reset();
        showToast('Buku ditambahkan');
    });
}

/* ---------- Initialize ---------- */
document.addEventListener('DOMContentLoaded', () => {
    ensureDemoAdmin();
    loadBooks();
    loadGenres();
    updateHeader();
    setActiveNav();

    const input = document.getElementById('search');
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cariBuku(); });

    // Highlight active nav link based on current path
    function setActiveNav() {
        const links = document.querySelectorAll('nav a');
        const path = window.location.pathname.split('/').pop() || 'index.html';
        links.forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;
            if (href === path) a.classList.add('active'); else a.classList.remove('active');
        });
    }

    const hasilEle = document.getElementById('hasil');
    if (hasilEle) {
        const query = new URLSearchParams(window.location.search).get('q') || '';
        const searchInput = document.getElementById('search');
        if (searchInput) searchInput.value = query;
        if (query) cariBuku();
        else renderResults(books, '');
    }
    renderProfile();

    const bookList = document.getElementById('book-list');
    if (bookList) {
        renderBooks();
        initAdminControls();
    }

    // genre: populate
    populateGenreSelects();
    renderGenresAdmin();

    // show/hide genre manager
    const showGenreBtn = document.getElementById('show-genre-manager');
    const genreManager = document.getElementById('genre-manager');
    if (showGenreBtn && genreManager) {
        showGenreBtn.addEventListener('click', () => { genreManager.style.display = genreManager.style.display === 'none' ? 'block' : 'none'; });
    }

    const addGenreForm = document.getElementById('add-genre-form');
    if (addGenreForm) {
        addGenreForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('genre-name').value.trim();
            if (addGenre(name)) {
                addGenreForm.reset();
            }
        });
    }

    const reportFilter = document.getElementById('report-filter');
    if (reportFilter) reportFilter.addEventListener('change', renderAdminDashboard);
    const searchSort = document.getElementById('search-sort');
    if (searchSort) searchSort.addEventListener('change', cariBuku);

    // update header again after any dynamic changes
    updateHeader();
    renderAdminDashboard();
});