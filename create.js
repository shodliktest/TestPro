import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const titleInput = document.getElementById('testTitle');
const subjectSelect = document.getElementById('subjectSelect');
const customSubjectInput = document.getElementById('customSubjectInput');
const visibilitySelect = document.getElementById('visibilitySelect');
const statusMsg = document.getElementById('statusMsg');
const adminLink = document.getElementById('adminLink');

let currentUser = null;
let parsedQuestions = [];

// 1. Foydalanuvchi va Adminlikni tekshirish
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            if (adminLink) adminLink.style.display = 'block';
        }
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fan tanlash mantiqi (Boshqa tanlansa inputni ochish)
subjectSelect.addEventListener('change', () => {
    if (subjectSelect.value === 'other') {
        customSubjectInput.style.display = 'block';
        customSubjectInput.focus();
    } else {
        customSubjectInput.style.display = 'none';
    }
});

// 3. Faylni o'qish va tahlil qilish
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    statusMsg.style.display = 'block';
    statusMsg.style.color = "var(--btn-primary)";
    statusMsg.innerText = "Fayl o'qilmoqda... ⏳";

    let rawText = "";

    try {
        if (ext === 'txt') rawText = await readTxt(file);
        else if (ext === 'pdf') rawText = await readPdf(file);
        else if (ext === 'docx') rawText = await readDocx(file);
        
        parsedQuestions = parseContent(rawText);
        
        if (parsedQuestions.length > 0) {
            statusMsg.innerText = `${parsedQuestions.length} ta savol tayyor! ✅`;
            statusMsg.style.color = "#2ecc71";
        } else {
            statusMsg.innerText = "Savollar topilmadi! Formatni tekshiring. ❌";
            statusMsg.style.color = "#e74c3c";
        }
    } catch (err) {
        statusMsg.innerText = "Faylni o'qishda xatolik!";
    }
});

// --- O'qish yordamchilari ---
function readTxt(file) {
    return new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsText(file);
    });
}

async function readPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(" ") + "\n";
    }
    return text;
}

async function readDocx(file) {
    const arrayBuffer = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer });
    return res.value;
}

// 4. Sening Parsing Logikang (A, B, C variantlar uchun)
function parseContent(data) {
    const lines = data.split('\n').map(l => l.trim()).filter(l => l !== "");
    let questionsArray = [];
    let currentQ = null;

    for (let line of lines) {
        if (/^\d+[\.\)]/.test(line)) {
            if (currentQ) questionsArray.push(currentQ);
            currentQ = { question: line.replace(/^\d+[\.\)]\s*/, ''), options: [] };
        } else if (/^[a-zA-Z][\.\)]/.test(line) && currentQ) {
            let isCorrect = line.includes('*') || line.includes('+');
            let text = line.replace(/^[a-zA-Z][\.\)]\s*/, '').replace(/[\*\+]/, '').trim();
            currentQ.options.push({ text: text, isCorrect: isCorrect });
        }
    }
    if (currentQ) questionsArray.push(currentQ);
    return questionsArray;
}

// 5. Bazaga yuklash
uploadBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const visibility = visibilitySelect.value;
    let subject = (subjectSelect.value === 'other') ? customSubjectInput.value.trim() : subjectSelect.value;

    if (!title || !subject || parsedQuestions.length === 0) return alert("Barcha maydonlarni to'ldiring!");

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...';

    try {
        const testId = "test_" + Date.now();
        await setDoc(doc(db, "tests", testId), {
            id: testId,
            authorId: currentUser.uid,
            title: title,
            subject: subject,
            visibility: visibility,
            questions: parsedQuestions,
            solvedCount: 0,
            createdAt: new Date()
        });

        // Dashboard keshini tozalash
        localStorage.removeItem('public_tests_cache');

        if (visibility === 'private') alert(`Shaxsiy test kodi: ${testId}`);
        else alert("Test ommaviy qilindi!");

        window.location.replace("dashboard.html");
    } catch (err) {
        alert("Xatolik: " + err.message);
        uploadBtn.disabled = false;
        uploadBtn.innerText = "Testni Bazaga Saqlash";
    }
});
        
