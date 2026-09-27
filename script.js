#### Файл `script.js`
```javascript
const textDisplay = document.getElementById('text-display');
const wpmElement = document.getElementById('wpm');
const errorsElement = document.getElementById('errors');
const accuracyElement = document.getElementById('accuracy');

const samples = {
    words: "дом кошка солнце машина облако река дорога музыка стекло письмо птица дерево книга чайник зеркало телефон занавеска",
    symbols: "a!b@c#d$e%f^g&h*i(j)k_l+m{n}o|p:q\"rt~u`v-w=x[y]z;1|2@3#4$5%6^7&8*9(0)",
    code: "def calculate_sum(a, b):\n    if a > 0:\n        return a + b\n    return [0, {}]"
};

let currentMode = 'words';
let charElements = [];
let currentIndex = 0;
let errorsCount = 0;
let startTime = null;
let isFinished = false;

function initTest() {
    textDisplay.innerHTML = '';
    currentIndex = 0;
    errorsCount = 0;
    startTime = null;
    isFinished = false;
    errorsElement.textContent = '0';
    accuracyElement.textContent = '100';
    wpmElement.textContent = '0';

    const text = samples[currentMode];
    
    for (let char of text) {
        const span = document.createElement('span');
        span.classList.add('char');
        span.textContent = char;
        textDisplay.appendChild(span);
    }

    charElements = textDisplay.querySelectorAll('.char');
    if (charElements.length > 0) {
        charElements[0].classList.add('current');
    }
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    initTest();
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        initTest();
        return;
    }

    if (isFinished || e.key.length > 1 && e.key !== 'Backspace') return;

    if (!startTime) {
        startTime = new Date();
    }

    const currentCharSpan = charElements[currentIndex];

    if (e.key === 'Backspace') {
        if (currentIndex > 0) {
            charElements[currentIndex].classList.remove('current');
            currentIndex--;
            charElements[currentIndex].classList.remove('correct', 'incorrect');
            charElements[currentIndex].classList.add('current');
        }
        return;
    }

    if (e.key === currentCharSpan.textContent) {
        currentCharSpan.classList.remove('current', 'incorrect');
        currentCharSpan.classList.add('correct');
        currentIndex++;
    } else {
        currentCharSpan.classList.remove('current');
        currentCharSpan.classList.add('incorrect');
        errorsCount++;
        currentIndex++;
        errorsElement.textContent = errorsCount;
    }

    // Расчет точности
    const accuracy = Math.max(0, Math.floor(((currentIndex - errorsCount) / currentIndex) * 100));
    accuracyElement.textContent = accuracy;

    // Расчет WPM
    const elapsedTime = (new Date() - startTime) / 60000; // в минутах
    if (elapsedTime > 0) {
        const wpm = Math.round((currentIndex / 5) / elapsedTime);
        wpmElement.textContent = wpm;
    }

    if (currentIndex < charElements.length) {
        charElements[currentIndex].classList.add('current');
    } else {
        isFinished = true;
    }
});

// Стартовая инициализация
initTest();
