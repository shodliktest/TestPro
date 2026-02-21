import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const testTitle = document.getElementById('testTitle');
const testDesc = document.getElementById('testDesc');
const questionsContainer = document.getElementById('questionsContainer');
const submitTestBtn = document.getElementById('submitTestBtn');
const resultModal = document.getElementById('resultModal');

let currentTest = null;
let currentUser = null;

// URL'dan test ID'sini olish (masalan: test.html?id=12345)
const urlParams = new URLSearchParams(window.location.search);
const testId = urlParams.get('id');

// Foydalanuvchini tekshirish
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (testId) {
            loadTest(testId);
        } else {
            alert("Test topilmadi!");
            window.location.href = "dashboard.html";
        }
    } else {
        window.location.href = "index.html";
    }
});

// Testni Firebase'dan tortib olish
async function loadTest(id) {
    try {
        const docRef = doc(db, "tests", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentTest = docSnap.data();
            testTitle.innerText = currentTest.title;
            testDesc.innerText = currentTest.description || "Omad yor bo'lsin!";
            renderQuestions(currentTest.questions);
        } else {
            testTitle.innerText = "Test bazadan topilmadi!";
            testDesc.innerText = "";
        }
    } catch (error) {
        console.error("Xato:", error);
        testTitle.innerText = "Xatolik yuz berdi!";
    }
}

// Savollarni ekranga chizish
function renderQuestions(questions) {
    questionsContainer.innerHTML = '';
    
    questions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.style.marginBottom = "30px";
        qDiv.style.padding = "20px";
        qDiv.style.background = "rgba(255, 255, 255, 0.05)";
        qDiv.style.borderRadius = "15px";
        qDiv.style.border = "1px solid var(--glass-border)";

        let optionsHTML = '';
        q.options.forEach((opt, optIndex) => {
            optionsHTML += `
                <label style="display: block; margin: 15px 0; cursor: pointer; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; transition: 0.3s;">
                    <input type="radio" name="q${index}" value="${optIndex}" style="width: auto; margin-right: 10px;">
                    ${opt}
                </label>
            `;
        });

        qDiv.innerHTML = `
            <h3 style="margin-bottom: 20px; font-size: 1.2rem;">${index + 1}. ${q.question}</h3>
            ${optionsHTML}
        `;
        questionsContainer.appendChild(qDiv);
    });

    submitTestBtn.style.display = 'block';
}

// Testni yakunlash va tekshirish
submitTestBtn.addEventListener('click', async () => {
    if (!currentTest) return;

    let correctAnswers = 0;
    const totalQuestions = currentTest.questions.length;

    // Har bir savolni tekshirib chiqish
    currentTest.questions.forEach((q, index) => {
        const selectedOpt = document.querySelector(`input[name="q${index}"]:checked`);
        // Agar foydalanuvchi tanlagan indeks to'g'ri indeksga teng bo'lsa
        if (selectedOpt && parseInt(selectedOpt.value) === q.correctIndex) {
            correctAnswers++;
        }
    });

    // Foizni hisoblash
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    // Natijani Modalda ko'rsatish
    document.getElementById('scoreDisplay').innerText = `${percentage}%`;
    document.getElementById('scoreDetails').innerText = `${correctAnswers} ta to'g'ri javob / ${totalQuestions} ta savol`;
    resultModal.style.display = 'flex';

    // Natijani Firebase'ga yozish
    try {
        await addDoc(collection(db, "results"), {
            userId: currentUser.uid,
            testId: testId,
            testTitle: currentTest.title,
            score: correctAnswers,
            totalQuestions: totalQuestions,
            percentage: percentage,
            completedAt: new Date()
        });
    } catch(e) {
        console.error("Natijani saqlashda xato", e);
    }
});
