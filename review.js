import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const testTitle = document.getElementById('testTitle');
const testScore = document.getElementById('testScore');
const questionsContainer = document.getElementById('questionsContainer');

const urlParams = new URLSearchParams(window.location.search);
const resultId = urlParams.get('id');

onAuthStateChanged(auth, async (user) => {
    if (user && resultId) {
        loadReviewData(resultId);
    } else {
        window.location.href = "history.html";
    }
});

async function loadReviewData(resId) {
    try {
        // 1. Result ma'lumotlarini olish
        const resSnap = await getDoc(doc(db, "results", resId));
        if (!resSnap.exists()) {
            questionsContainer.innerHTML = "<p>Natija topilmadi.</p>";
            return;
        }
        const resultData = resSnap.data();
        
        // Agar eski test bo'lsa (userAnswers saqlanmagan bo'lsa), bo'sh massiv qilamiz
        const userAnswers = resultData.userAnswers || []; 
        testScore.innerText = `Natijangiz: ${resultData.percentage}% (${resultData.score} ta to'g'ri / ${resultData.totalQuestions} ta savol)`;

        // 2. Asl test savollarini olish
        const testSnap = await getDoc(doc(db, "tests", resultData.testId));
        if (!testSnap.exists()) {
            questionsContainer.innerHTML = "<p style='color:red;'>Asl test muallif tomonidan o'chirilgan yoki topilmadi.</p>";
            return;
        }
        const testData = testSnap.data();
        testTitle.innerText = testData.title + " (Tahlil)";

        // 3. Ekranga rangli qilib chizish
        renderReview(testData.questions, userAnswers);

    } catch (error) {
        console.error(error);
        questionsContainer.innerHTML = "<p>Xatolik yuz berdi!</p>";
    }
}

function renderReview(questions, userAnswers) {
    questionsContainer.innerHTML = '';
    
    // Agar bu yangilanishgacha ishlangan test bo'lsa ogohlantiramiz
    if (userAnswers.length === 0) {
        questionsContainer.innerHTML = "<p style='color: orange; margin-bottom: 20px;'>⚠️ Diqqat: Ushbu natijada sizning belgilagan javoblaringiz bazada saqlanmagan (chunki siz bu qoidani qo'shishimizdan oldin ishlagansiz). Faqat to'g'ri variantlar ko'rsatiladi.</p>";
    }

    questions.forEach((q, i) => {
        const qDiv = document.createElement('div');
        qDiv.style.marginBottom = "30px";
        qDiv.style.padding = "20px";
        qDiv.style.background = "rgba(255, 255, 255, 0.05)";
        qDiv.style.borderRadius = "15px";
        qDiv.style.border = "1px solid var(--glass-border)";

        const selectedVal = userAnswers[i] !== undefined ? userAnswers[i] : -1;

        let optionsHTML = '';
        q.options.forEach((opt, j) => {
            let bg = 'rgba(0,0,0,0.2)';
            let border = 'transparent';
            
            // To'g'ri javob doim yashil yonadi
            if (j === q.correctIndex) {
                bg = 'rgba(46, 204, 113, 0.3)';
                border = '1px solid #2ecc71';
            } 
            // Agar foydalanuvchi xato javobni tanlagan bo'lsa, u qizil yonadi
            else if (j === selectedVal && selectedVal !== q.correctIndex) {
                bg = 'rgba(231, 76, 60, 0.3)';
                border = '1px solid #e74c3c';
            }

            // Radio inputni tanlangan qilib ko'rsatish
            const checkedAttr = (j === selectedVal) ? 'checked' : '';

            optionsHTML += `
                <label style="display: block; margin: 15px 0; padding: 10px; background: ${bg}; border: ${border}; border-radius: 8px;">
                    <input type="radio" disabled ${checkedAttr} style="width: auto; margin-right: 10px;">
                    ${opt}
                </label>
            `;
        });

        qDiv.innerHTML = `
            <h3 style="margin-bottom: 20px; font-size: 1.2rem;">${i + 1}. ${q.question}</h3>
            ${optionsHTML}
        `;
        questionsContainer.appendChild(qDiv);
    });
            }
