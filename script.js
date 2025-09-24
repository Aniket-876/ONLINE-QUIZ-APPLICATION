document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    const SUBJECT_TO_CATEGORY_ID = {
        HTML: 18, // Computer Science Category ID from Open Trivia DB
        CSS: 18,  // Computer Science
        JavaScript: 18 // Computer Science
    };

    // --- DOM Elements ---
    const loaderOverlay = document.getElementById('loader-overlay');
    const screens = { home: document.getElementById('home-screen'), subjectSelection: document.getElementById('subject-selection-screen'), levelSelection: document.getElementById('level-selection-screen'), quiz: document.getElementById('quiz-screen'), results: document.getElementById('results-screen') };
    const startBtn = document.getElementById('start-btn');
    const subjectCards = document.querySelectorAll('.subject-card');
    const levelCards = document.querySelectorAll('.level-card');
    const nextBtn = document.getElementById('next-question-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const questionTextEl = document.getElementById('question-text');
    const answerButtonsEl = document.getElementById('answer-buttons');
    const currentQuestionNumEl = document.getElementById('current-question-num');
    const progressFill = document.getElementById('progress-fill');
    const quizTimeLeftEl = document.getElementById('quiz-time-left');
    const scoreCounterEl = document.getElementById('final-score-counter');
    const correctAnswersEl = document.getElementById('correct-answers-count');
    const resultsDetailsText = document.getElementById('results-details-text');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const confettiInstance = confetti.create(confettiCanvas, { resize: true, useWorker: true });

    // --- State Variables ---
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let quizTimer;
    let selectedSubject = '';
    let selectedLevel = '';
    const LEVEL_SETTINGS = { easy: { time: 120 }, medium: { time: 90 }, hard: { time: 60 } };

    // --- API Functions ---
    async function fetchQuestions(subject, level) {
        const categoryId = SUBJECT_TO_CATEGORY_ID[subject];
        const url = `https://opentdb.com/api.php?amount=10&category=${categoryId}&difficulty=${level}&type=multiple`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error("Could not fetch questions:", error);
            alert("Failed to load questions. Please check your internet connection and try again.");
            return null;
        }
    }

    function transformQuestions(apiQuestions) {
        return apiQuestions.map(apiQuestion => {
            const answers = [...apiQuestion.incorrect_answers].map(text => ({ text, correct: false }));
            const correctPosition = Math.floor(Math.random() * (answers.length + 1));
            answers.splice(correctPosition, 0, { text: apiQuestion.correct_answer, correct: true });

            const tempElement = document.createElement('textarea');
            tempElement.innerHTML = apiQuestion.question;
            const decodedQuestion = tempElement.value;

            return {
                question: decodedQuestion,
                answers: answers
            };
        });
    }

    // --- App Logic ---
    const showScreen = (screenName) => {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    };

    const selectSubject = (subject) => {
        selectedSubject = subject;
        showScreen('levelSelection');
    };

    const selectLevel = async (level) => {
        selectedLevel = level;
        loaderOverlay.classList.remove('hidden');

        const apiQuestions = await fetchQuestions(selectedSubject, level);

        loaderOverlay.classList.add('hidden');

        if (apiQuestions && apiQuestions.length > 0) {
            currentQuestions = transformQuestions(apiQuestions);
            startQuiz();
        } else {
            showScreen('subjectSelection');
        }
    };
    
    const startQuiz = () => {
        currentQuestionIndex = 0;
        score = 0;
        nextBtn.classList.add('hidden');
        showScreen('quiz');
        displayQuestion();
        clearInterval(quizTimer);
        startQuizTimer(LEVEL_SETTINGS[selectedLevel].time);
    };

    const startQuizTimer = (duration) => {
        let timeLeft = duration;
        const updateTimerDisplay = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            quizTimeLeftEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        updateTimerDisplay();
        quizTimer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(quizTimer);
                showResults();
            }
        }, 1000);
    };

    const displayQuestion = () => {
        resetState();
        const question = currentQuestions[currentQuestionIndex];
        questionTextEl.textContent = question.question;
        currentQuestionNumEl.textContent = currentQuestionIndex + 1;
        updateProgressBar();

        question.answers.forEach(answer => {
            const button = document.createElement('button');
            const tempElement = document.createElement('textarea');
            tempElement.innerHTML = answer.text;
            button.textContent = tempElement.value;

            button.classList.add('btn', 'answer-button');
            if (answer.correct) button.dataset.correct = true;
            button.addEventListener('click', selectAnswer);
            answerButtonsEl.appendChild(button);
        });
    };

    const selectAnswer = (e) => {
        const selectedBtn = e.target;
        const isCorrect = selectedBtn.dataset.correct === 'true';
        if (isCorrect) score++;
        Array.from(answerButtonsEl.children).forEach(button => {
            button.classList.add('disabled');
            if (button.dataset.correct) button.classList.add('correct');
        });
        if (!isCorrect) selectedBtn.classList.add('incorrect');
        nextBtn.classList.remove('hidden');
    };

    const handleNextButton = () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            displayQuestion();
        } else {
            clearInterval(quizTimer);
            showResults();
        }
    };
    
    const showResults = () => {
        showScreen('results');
        clearInterval(quizTimer);
        const percentage = Math.round((score / currentQuestions.length) * 100);
        correctAnswersEl.textContent = score;
        resultsDetailsText.innerHTML = `Results for: <strong>${selectedSubject}</strong> (${selectedLevel})`;
        let currentScore = 0;
        scoreCounterEl.textContent = 0;
        const scoreInterval = setInterval(() => {
            if (currentScore >= percentage) {
                clearInterval(scoreInterval);
                scoreCounterEl.textContent = percentage;
            } else {
                currentScore++;
                scoreCounterEl.textContent = currentScore;
            }
        }, 20);
        if (percentage > 70) {
            confettiInstance({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
    };

    const resetState = () => {
        nextBtn.classList.add('hidden');
        while (answerButtonsEl.firstChild) {
            answerButtonsEl.removeChild(answerButtonsEl.firstChild);
        }
    };
    
    const updateProgressBar = () => {
        const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
        progressFill.style.width = `${progress}%`;
    };

    // --- Event Listeners ---
    startBtn.addEventListener('click', () => showScreen('subjectSelection'));

    subjectCards.forEach(card => {
        card.addEventListener('click', () => {
            selectSubject(card.dataset.subject);
        });
    });

    levelCards.forEach(card => {
        card.addEventListener('click', () => {
            selectLevel(card.dataset.level);
        });
    });

    nextBtn.addEventListener('click', handleNextButton);
    
    playAgainBtn.addEventListener('click', () => showScreen('subjectSelection'));

    // --- Initial State ---
    showScreen('home');
});