import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, deleteDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const usersList = document.getElementById('usersList');
const adminTestsContainer = document.getElementById('adminTestsContainer');
let currentUser = null;

// XAVFSIZLIK TEKSHIRUVI (Faqat adminlar kira oladi)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                // Agar haqiqiy admin bo'lsa, ma'lumotlarni yuklaymiz
                loadAdminData();
            } else {
                // Admin bo'lmasa, ruxsat yo'q!
                alert("Sizda administrator huquqi yo'q!");
                window.location.href = "dashboard.html";
            }
        } catch (error) {
            console.error("Ruxsatni tekshirishda xato:", error);
            window.location.href = "dashboard.html";
        }
    } else {
        window.location.href = "index.html";
    }
});

// BARCHA MA'LUMOTLARNI YUKLASH
async function loadAdminData() {
    await loadUsers();
    await loadAllTests();
}

// 1. FOYDALANUVCHILARNI YUKLASH
async function loadUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        document.getElementById('totalUsersStat').innerText = querySnapshot.size;
        
        usersList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString('uz-UZ') : 'Noma\'lum';
            const roleBadge = data.role === 'admin' 
                ? '<span class="badge badge-admin">Admin</span>' 
                : '<span class="badge badge-user">User</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold;">${data.email}</td>
                <td style="font-size: 0.8rem; opacity: 0.7;">${data.uid.substring(0, 10)}...</td>
                <td>${roleBadge}</td>
                <td class="hide-mobile">${dateStr}</td>
            `;
            usersList.appendChild(tr);
        });
    } catch (error) {
        console.error("Userlarni yuklashda xato:", error);
        usersList.innerHTML = '<tr><td colspan="4" style="color:red;">Xatolik yuz berdi.</td></tr>';
    }
}

// 2. TESTLARNI YUKLASH (Va o'chirish tugmasini qo'shish)
async function loadAllTests() {
    try {
        adminTestsContainer.innerHTML = '';
        const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        document.getElementById('totalPlatformTests').innerText = querySnapshot.size;

        if (querySnapshot.empty) {
            adminTestsContainer.innerHTML = '<p>Platformada testlar yo\'q.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const test = docSnap.data();
            const testId = docSnap.id;
            
            const card = document.createElement('div');
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.padding = '15px';
            card.style.background = 'rgba(0,0,0,0.2)';
            card.style.borderRadius = '12px';
            card.style.border = '1px solid var(--glass-border)';

            card.innerHTML = `
                <div>
                    <h3 style="margin-bottom: 5px; font-size: 1.1rem; color: var(--btn-primary);">${test.title}</h3>
                    <p style="font-size: 0.85rem; opacity: 0.7;">${test.questions.length} ta savol | Holati: ${test.visibility}</p>
                </div>
                <button onclick="deleteTest('${testId}')" class="btn" style="background: #e74c3c; color: white; width: auto; padding: 8px 15px; margin: 0; font-size: 0.9rem;">
                    <i class="fas fa-trash-alt"></i> O'chirish
                </button>
            `;
            adminTestsContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Testlarni yuklashda xato:", error);
        adminTestsContainer.innerHTML = '<p style="color: red;">Xatolik yuz berdi.</p>';
    }
}

// 3. TESTNI O'CHIRISH FUNKSIYASI (Global)
window.deleteTest = async (testId) => {
    const confirmDelete = confirm("Diqqat! Bu testni butunlay o'chirib tashlamoqchimisiz? Uni qaytarib bo'lmaydi.");
    
    if (confirmDelete) {
        try {
            await deleteDoc(doc(db, "tests", testId));
            alert("Test muvaffaqiyatli o'chirildi!");
            loadAllTests(); // Ro'yxatni yangilash
        } catch (error) {
            console.error("O'chirishda xato:", error);
            alert("Xatolik yuz berdi: " + error.message);
        }
    }
};

// Chiqish va Dark Mode
document.getElementById('logoutBtn').addEventListener('click', () => { signOut(auth).then(() => { window.location.href = "index.html"; }); });
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
});
// ==========================================
// TUN REJIMI (DARK MODE) SAQLASH VA ISHLATISH
// ==========================================
const themeToggle = document.getElementById('themeToggle');

// 1. Sahifa yuklanishi bilan LocalStorage'ni tekshirish
if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

// 2. Tugma bosilganda rejimi o'zgartirish va xotiraga yozish
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light'); // Yorug' rejimni eslab qolish
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark'); // Tun rejimini eslab qolish
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
}

