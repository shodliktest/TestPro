import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const questionContainer = document.getElementById('questionContainer');
const testTitleHeader = document.getElementById('testTitleHeader');

let currentQuestions = [];
let userAnswers = [];
let currentTestId = "";
let testTitle = "";

const urlParams = new URLSearchParams(window.location.search);
const testId = urlParams.get('id');

onAuthStateChanged(auth, async (user) => {
    if (user && testId) {
        currentTestId = testId;
        loadTestData(testId);
    } else {
        window.location.replace("dashboard.html");
    }
});

async function loadTestData(id) {
    const docSnap = await getDoc(doc(db, "tests", id));
    if (docSnap.exists()) {
        const data = docSnap.data();
        currentQuestions = data.questions;
        testTitle = data.title;
        testTitleHeader.innerText = testTitle;
        renderQuestions();
    }
}

function renderQuestions() {
    questionContainer.innerHTML = '';
    currentQuestions.forEach((q, qIndex) => {
        const qCard = document.createElement('div');
        qCard.className = 'glass-card question-card';
        
        let optionsHtml = '';
        
        // MUHIM QISM: opt emas, opt.text ishlatiladi
        q.options.forEach((opt, optIndex) => {
            optionsHtml += `
                <label class="option-label">
                    <input type="radio" name="q${qIndex}" value="${optIndex}" required>
                    <span class="custom-radio"></span>
                    <span class="option-text">${opt.text}</span>
                </label>
            `;
        });

        qCard.innerHTML = `
            <h3>${qIndex + 1}. ${q.question}</h3>
            <div class="options-grid">${optionsHtml}</div>
        `;
        questionContainer.appendChild(qCard);
    });

    // Tugmani qo'shish
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn';
    submitBtn.innerText = 'Testni yakunlash';
    submitBtn.onclick = submitTest;
    questionContainer.appendChild(submitBtn);
}

async function submitTest() {
    const answers = [];
    let score = 0;

    currentQuestions.forEach((q, i) => {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        const answerIndex = selected ? parseInt(selected.value) : null;
        answers.push(answerIndex);

        if (answerIndex !== null && q.options[answerIndex].isCorrect) {
            score++;
        }
    });

    const percentage = Math.round((score / currentQuestions.length) * 100);

    const resultData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        testId: currentTestId,
        testTitle: testTitle,
        score: score,
        totalQuestions: currentQuestions.length,
        percentage: percentage,
        userAnswers: answers,
        questions: currentQuestions,
        completedAt: new Date()
    };

    try {
        const docRef = await addDoc(collection(db, "results"), resultData);
        window.location.href = `review.html?id=${docRef.id}`;
    } catch (e) {
        alert("Natijani saqlashda xato!");
    }
                             }
