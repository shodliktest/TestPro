import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const testTitle = document.getElementById('testTitle');
const testDesc = document.getElementById('testDesc');
const questionsContainer = document.getElementById('questionsContainer');
const submitTestBtn = document.getElementById('submitTestBtn');
const resultModal = document.getElementById('resultModal');
const reviewBtn = document.getElementById('reviewBtn'); // Tahlil tugmasi

let currentTest = null;
let currentUser = null;

// URL'dan test ID'sini olish
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
                <label id="label_${index}_${optIndex}" style="display: block; margin: 15px 0; cursor: pointer; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; transition: 0.3s;">
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

// Testni yakunlash, tekshirish va bazaga saqlash
submitTestBtn.addEventListener('click', async () => {
    if (!currentTest) return;

    let correctAnswers = 0;
    const totalQuestions = currentTest.questions.length;
    let userAnswers = []; // Foydalanuvchi tanlagan javoblarni saqlash uchun massiv

    // Har bir savolni tekshirib chiqish
    currentTest.questions.forEach((q, index) => {
        const selectedOpt = document.querySelector(`input[name="q${index}"]:checked`);
        const selectedVal = selectedOpt ? parseInt(selectedOpt.value) : -1; // Agar belgilamagan bo'lsa -1
        
        userAnswers.push(selectedVal); // Bazaga saqlash uchun massivga qo'shamiz

        if (selectedVal === q.correctIndex) {
            correctAnswers++;
        }
    });

    // Foizni hisoblash
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    // Natijani Modalda ko'rsatish
    document.getElementById('scoreDisplay').innerText = `${percentage}%`;
    document.getElementById('scoreDetails').innerText = `${correctAnswers} ta to'g'ri javob / ${totalQuestions} ta savol`;
    resultModal.style.display = 'flex';

    // TAHLIL QILISH (Joriy oyna ichida)
    if(reviewBtn) {
        reviewBtn.onclick = () => {
            resultModal.style.display = 'none'; // Modalni yopamiz
            submitTestBtn.style.display = 'none'; // Yakunlash tugmasini yashiramiz

            currentTest.questions.forEach((q, i) => {
                const selectedVal = userAnswers[i]; // Eslab qolingan foydalanuvchi javobi

                q.options.forEach((opt, j) => {
                    const label = document.getElementById(`label_${i}_${j}`);
                    const radio = label.querySelector('input');
                    radio.disabled = true; // Boshqa belgilab bo'lmaydigan qilib qulflaymiz

                    if (j === q.correctIndex) {
                        // To'g'ri javobni yashil qilamiz
                        label.style.background = 'rgba(46, 204, 113, 0.3)';
                        label.style.border = '1px solid #2ecc71';
                    } else if (j === selectedVal && selectedVal !== q.correctIndex) {
                        // Belgilangan noto'g'ri javobni qizil qilamiz
                        label.style.background = 'rgba(231, 76, 60, 0.3)';
                        label.style.border = '1px solid #e74c3c';
                    }
                });
            });
        };
    }

    // Natijani va belgilangan javoblarni Firebase'ga yozish
    try {
        await addDoc(collection(db, "results"), {
            userId: currentUser.uid,
            testId: testId,
            testTitle: currentTest.title,
            score: correctAnswers,
            totalQuestions: totalQuestions,
            percentage: percentage,
            userAnswers: userAnswers, // 👈 Asosiy o'zgarish shu yerda
            completedAt: new Date()
        });
    } catch(e) {
        console.error("Natijani saqlashda xato", e);
    }
});
