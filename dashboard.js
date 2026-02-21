import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, increment, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- GLOBAL FUNKSIYALAR (HTMLdan chaqirish uchun) ---
window.startTest = (id) => { window.location.href = `test.html?id=${id}`; };
window.closeLeaderboard = () => { document.getElementById('leaderboardModal').style.display = 'none'; };

window.showLeaderboard = async (testId, title) => {
    const modal = document.getElementById('leaderboardModal');
    modal.style.display = 'block';
    document.getElementById('modalTestTitle').innerText = title;
    const body = document.getElementById('leaderboardBody');
    const loading = document.getElementById('leaderboardLoading');
    const table = document.getElementById('leaderboardTable');
    
    body.innerHTML = '';
    loading.style.display = 'block';
    table.style.display = 'none';

    try {
        const q = query(collection(db, "results"), where("testId", "==", testId), orderBy("percentage", "desc"), limit(10));
        const snap = await getDocs(q);
        loading.style.display = 'none';
        
        if (snap.empty) {
            document.getElementById('noResultsMsg').style.display = 'block';
        } else {
            table.style.display = 'table';
            document.getElementById('noResultsMsg').style.display = 'none';
            let i = 1;
            snap.forEach(d => {
                const res = d.data();
                body.innerHTML += `<tr><td>${i++}</td><td>${res.userEmail.split('@')[0]}</td><td><strong>${res.percentage}%</strong></td></tr>`;
            });
        }
    } catch (e) { 
        loading.innerText = "Xato! Index yaratilmagan."; 
    }
};

// --- AUTH VA YUKLASH ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email.split('@')[0];
        
        // Tashrifni sanash (Statistika uchun)
        if (!sessionStorage.getItem('v')) {
            await updateDoc(doc(db, "users", user.uid), { visitCount: increment(1) }).catch(()=>{});
            sessionStorage.setItem('v', '1');
        }

        // Admin panel tugmasini tekshirish
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            document.getElementById('adminLink').style.display = 'block';
        }

        loadDashboardData(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

async function loadDashboardData(uid) {
    try {
        const testsSnap = await getDocs(query(collection(db, "tests"), where("visibility", "==", "public")));
        const resultsSnap = await getDocs(query(collection(db, "results"), where("userId", "==", uid)));
        const userDoc = await getDoc(doc(db, "users", uid));

        renderUI({
            user: userDoc.data() || {},
            tests: testsSnap.docs.map(d => ({id: d.id, ...d.data()})),
            results: resultsSnap.docs.map(d => d.data())
        });
    } catch (e) { console.error("Xatolik:", e); }
}

function renderUI(data) {
    // 1. Katta Statistika
    const solved = data.results.length;
    const avg = solved > 0 ? Math.round(data.results.reduce((s, r) => s + r.percentage, 0) / solved) : 0;
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><h3>${data.user.visitCount || 0}</h3><p>Tashrif</p></div>
        <div class="stat-card"><h3>${solved}</h3><p>Yechildi</p></div>
        <div class="stat-card"><h3>${avg}%</h3><p>Natija</p></div>
    `;

    // 2. Fanlar Bo'yicha Guruhlash
    const groups = {};
    data.tests.forEach(t => {
        const s = t.subject || "Boshqa";
        if (!groups[s]) groups[s] = [];
        groups[s].push(t);
    });

    const container = document.getElementById('testsContainer');
    container.innerHTML = '<h2 class="section-title"><i class="fas fa-book"></i> Mavjud Testlar</h2>';
    
    for (const [sub, tests] of Object.entries(groups)) {
        const header = document.createElement('div');
        header.className = 'date-header';
        header.innerHTML = `<span>${sub}</span> <span>${tests.length} ta test <i class="fas fa-chevron-down"></i></span>`;
        
        const items = document.createElement('div');
        items.className = 'date-items';

        tests.forEach(test => {
            const card = document.createElement('div');
            card.className = 'glass-card test-item-swipe';
            card.innerHTML = `
                <div onclick="window.startTest('${test.id}')" style="flex:1;">
                    <h4 style="margin:0;">${test.title}</h4>
                </div>
                <button class="btn-trophy" onclick="window.showLeaderboard('${test.id}', '${test.title}')">
                    <i class="fas fa-trophy"></i>
                </button>
            `;

            // SWIPE EFFEKTI
            let startX = 0;
            card.addEventListener('touchstart', e => startX = e.touches[0].clientX);
            card.addEventListener('touchend', e => {
                if (startX - e.changedTouches[0].clientX > 70) window.showLeaderboard(test.id, test.title);
            });

            items.appendChild(card);
        });

        header.onclick = () => items.classList.toggle('active');
        container.appendChild(header);
        container.appendChild(items);
    }
}

// Chiqish Tugmasi
document.getElementById('logoutBtn').addEventListener('click', () => {
    if(confirm("Chiqasizmi?")) signOut(auth).then(() => {
        localStorage.clear();
        window.location.replace("index.html");
    });
});
