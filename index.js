// Quiz Application State Management
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial State
    const allQuestions = window.QUIZ_QUESTIONS || [];
    let userAnswers = JSON.parse(localStorage.getItem("quiz_answers") || "{}"); // Format: { questionNum: { selectedIndex, isCorrect } }
    let bookmarks = new Set(JSON.parse(localStorage.getItem("quiz_bookmarks") || "[]"));
    let selectedLevelFilter = "all";
    let isOnlyBookmarksFiltered = false;
    
    // Filters and Navigation State
    let filteredQuestions = [...allQuestions];
    let currentIndex = 0; // Index in the filtered list
    
    // UI Elements
    const quizScreen = document.getElementById("quiz-screen");
    const statsScreen = document.getElementById("stats-screen");
    
    const questionLevel = document.getElementById("question-level");
    const questionIndexBadge = document.getElementById("question-index-badge");
    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options-container");
    const bookmarkBtn = document.getElementById("bookmark-btn");
    
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const showStatsBtn = document.getElementById("show-stats-btn");
    
    const feedbackContainer = document.getElementById("feedback-container");
    const feedbackTitle = document.getElementById("feedback-title");
    const feedbackMessage = document.getElementById("feedback-message");
    
    const searchInput = document.getElementById("search-input");
    const clearSearchBtn = document.getElementById("clear-search");
    const levelFilter = document.getElementById("level-filter");
    const bookmarkFilterBtn = document.getElementById("bookmark-filter-btn");
    const bookmarkCountBadge = document.getElementById("bookmark-count");
    
    // Stats elements
    const statsTotalAnswered = document.getElementById("stats-total-answered");
    const statsCorrectCount = document.getElementById("stats-correct-count");
    const statsIncorrectCount = document.getElementById("stats-incorrect-count");
    const statsAccuracy = document.getElementById("stats-accuracy");
    
    // Level progress bars in stats
    const barLvl1 = document.getElementById("bar-lvl1");
    const txtLvl1 = document.getElementById("txt-lvl1");
    const barLvl2 = document.getElementById("bar-lvl2");
    const txtLvl2 = document.getElementById("txt-lvl2");
    const barLvl3 = document.getElementById("bar-lvl3");
    const txtLvl3 = document.getElementById("txt-lvl3");
    
    const resumeQuizBtn = document.getElementById("resume-quiz-btn");
    const resetQuizBtn = document.getElementById("reset-quiz-btn");
    
    // Footer progress
    const footerScoreText = document.getElementById("footer-score-text");
    const footerIndexText = document.getElementById("footer-index-text");
    const globalProgressBar = document.getElementById("global-progress-bar");
    
    // Theme Toggle State
    const themeToggleBtn = document.getElementById("theme-toggle");
    let currentTheme = localStorage.getItem("quiz_theme") || "dark";
    document.documentElement.setAttribute("data-theme", currentTheme);
    
    // 2. Initialize App
    function init() {
        applyFilters();
        updateScoreboard();
        updateBookmarkCount();
        
        // Event Listeners
        themeToggleBtn.addEventListener("click", toggleTheme);
        
        searchInput.addEventListener("input", () => {
            clearSearchBtn.style.display = searchInput.value ? "block" : "none";
            applyFilters();
        });
        clearSearchBtn.addEventListener("click", () => {
            searchInput.value = "";
            clearSearchBtn.style.display = "none";
            applyFilters();
        });
        
        levelFilter.addEventListener("change", (e) => {
            selectedLevelFilter = e.target.value;
            applyFilters();
        });
        
        bookmarkFilterBtn.addEventListener("click", toggleBookmarkFilter);
        bookmarkBtn.addEventListener("click", toggleCurrentBookmark);
        
        prevBtn.addEventListener("click", showPrevQuestion);
        nextBtn.addEventListener("click", handleNextAction);
        
        showStatsBtn.addEventListener("click", showStats);
        resumeQuizBtn.addEventListener("click", showQuiz);
        resetQuizBtn.addEventListener("click", resetProgress);
    }
    
    // 3. Theme Toggle
    function toggleTheme() {
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", currentTheme);
        localStorage.setItem("quiz_theme", currentTheme);
    }
    
    // 4. Filtering Logic
    function applyFilters() {
        const searchText = searchInput.value.toLowerCase().trim();
        
        filteredQuestions = allQuestions.filter(q => {
            // Level Filter match
            if (selectedLevelFilter !== "all") {
                const lvlNum = q.level.match(/\d+/);
                const levelVal = lvlNum ? lvlNum[0] : "";
                if (levelVal !== selectedLevelFilter) return false;
            }
            
            // Bookmark Filter match
            if (isOnlyBookmarksFiltered && !bookmarks.has(q.num)) return false;
            
            // Search query match (search by question text or question number)
            if (searchText) {
                const numStr = q.num.toString();
                const textMatch = q.question.toLowerCase().includes(searchText);
                const numMatch = numStr === searchText || numStr.startsWith(searchText + ".") || q.question.startsWith(searchText);
                if (!textMatch && !numMatch) return false;
            }
            return true;
        });
        
        currentIndex = 0;
        showQuestion();
    }
    
    function toggleBookmarkFilter() {
        isOnlyBookmarksFiltered = !isOnlyBookmarksFiltered;
        bookmarkFilterBtn.classList.toggle("active", isOnlyBookmarksFiltered);
        applyFilters();
    }
    
    // 5. Render Question
    function showQuestion() {
        // Reset feedback
        feedbackContainer.classList.add("hidden");
        feedbackContainer.classList.remove("correct-style", "incorrect-style");
        
        if (filteredQuestions.length === 0) {
            // Render Empty State
            questionLevel.textContent = "ПОРОЖНЬО";
            questionIndexBadge.textContent = "0/0";
            questionText.textContent = "Не знайдено запитань за вашим пошуком або фільтрами.";
            optionsContainer.innerHTML = "";
            bookmarkBtn.classList.remove("active");
            bookmarkBtn.disabled = true;
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            nextBtn.querySelector("span").textContent = "Пропустити";
            footerIndexText.textContent = "Питання: 0/0";
            return;
        }
        
        bookmarkBtn.disabled = false;
        
        const q = filteredQuestions[currentIndex];
        
        // Update header info (Format: "34/600")
        questionLevel.textContent = q.level;
        const indexTextStr = `${q.num}/${allQuestions.length}`;
        questionIndexBadge.textContent = indexTextStr;
        footerIndexText.textContent = `Питання: ${indexTextStr}`;
        
        questionText.textContent = q.question;
        
        // Bookmark active state
        bookmarkBtn.classList.toggle("active", bookmarks.has(q.num));
        
        // Render Options
        optionsContainer.innerHTML = "";
        
        const answerState = userAnswers[q.num]; // { selectedIndex, isCorrect }
        const isAnswered = !!answerState;
        
        q.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            
            const numSpan = document.createElement("span");
            numSpan.className = "option-num";
            numSpan.textContent = idx + 1;
            
            const textSpan = document.createElement("span");
            textSpan.className = "option-text";
            textSpan.textContent = opt.text;
            
            btn.appendChild(numSpan);
            btn.appendChild(textSpan);
            
            if (isAnswered) {
                btn.classList.add("disabled");
                if (opt.correct) {
                    btn.classList.add("correct");
                }
                if (answerState.selectedIndex === idx && !answerState.isCorrect) {
                    btn.classList.add("incorrect");
                }
            } else {
                btn.addEventListener("click", () => selectOption(idx));
            }
            
            optionsContainer.appendChild(btn);
        });
        
        // Navigation Buttons state
        prevBtn.disabled = currentIndex === 0;
        
        if (isAnswered) {
            nextBtn.querySelector("span").textContent = "Наступне";
            showFeedback(answerState.isCorrect);
        } else {
            nextBtn.querySelector("span").textContent = "Пропустити";
        }
        
        nextBtn.disabled = currentIndex === filteredQuestions.length - 1 && isAnswered;
        
        // Update progress bar to show navigation position
        const navigationPercent = filteredQuestions.length > 0 ? Math.round(((currentIndex + 1) / filteredQuestions.length) * 100) : 0;
        globalProgressBar.style.width = `${navigationPercent}%`;
    }
    
    // 6. Option Selection Logic
    function selectOption(selectedIndex) {
        const q = filteredQuestions[currentIndex];
        if (userAnswers[q.num]) return; // Already answered
        
        const correctIndex = q.options.findIndex(opt => opt.correct);
        const isCorrect = selectedIndex === correctIndex;
        
        // Save Answer
        userAnswers[q.num] = { selectedIndex, isCorrect };
        localStorage.setItem("quiz_answers", JSON.stringify(userAnswers));
        
        // Update scoreboard & UI
        updateScoreboard();
        showQuestion();
        
        // Animation feedback
        if (!isCorrect) {
            const card = document.querySelector(".quiz-card");
            card.classList.add("shake");
            setTimeout(() => card.classList.remove("shake"), 300);
        }
    }
    
    // 7. Feedback Message
    function showFeedback(isCorrect) {
        feedbackContainer.classList.remove("hidden");
        if (isCorrect) {
            feedbackContainer.classList.add("correct-style");
            feedbackTitle.textContent = "Правильно!";
            feedbackMessage.textContent = "Ви дали абсолютно правильну відповідь.";
        } else {
            feedbackContainer.classList.add("incorrect-style");
            feedbackTitle.textContent = "Неправильно";
            feedbackMessage.textContent = "Ви обрали хибний варіант. Правильна відповідь виділена зеленим кольором.";
        }
    }
    
    // 8. Navigation functions
    function showPrevQuestion() {
        if (currentIndex > 0) {
            currentIndex--;
            showQuestion();
        }
    }
    
    function handleNextAction() {
        const q = filteredQuestions[currentIndex];
        const isAnswered = !!userAnswers[q.num];
        
        if (!isAnswered) {
            // Skip action: just advance without saving score
            if (currentIndex < filteredQuestions.length - 1) {
                currentIndex++;
                showQuestion();
            }
        } else {
            // Next action: advance
            if (currentIndex < filteredQuestions.length - 1) {
                currentIndex++;
                showQuestion();
            }
        }
    }
    
    // 9. Bookmarks toggle
    function toggleCurrentBookmark() {
        if (filteredQuestions.length === 0) return;
        const q = filteredQuestions[currentIndex];
        if (bookmarks.has(q.num)) {
            bookmarks.delete(q.num);
        } else {
            bookmarks.add(q.num);
        }
        localStorage.setItem("quiz_bookmarks", JSON.stringify(Array.from(bookmarks)));
        updateBookmarkCount();
        showQuestion();
    }
    
    function updateBookmarkCount() {
        bookmarkCountBadge.textContent = bookmarks.size;
    }
    
    // 10. Scoreboard calculation
    function updateScoreboard() {
        const answeredKeys = Object.keys(userAnswers);
        
        let correctCount = 0;
        answeredKeys.forEach(k => {
            if (userAnswers[k].isCorrect) correctCount++;
        });
        
        // Footer updates
        footerScoreText.textContent = `Правильних відповідей: ${correctCount}`;
    }
    
    function showStats() {
        quizScreen.classList.remove("active");
        statsScreen.classList.add("active");
        
        // Calculate Stats
        const answeredKeys = Object.keys(userAnswers);
        const totalAnswered = answeredKeys.length;
        
        let correctCount = 0;
        let lvl1Correct = 0, lvl1Total = 0, lvl1Answered = 0;
        let lvl2Correct = 0, lvl2Total = 0, lvl2Answered = 0;
        let lvl3Correct = 0, lvl3Total = 0, lvl3Answered = 0;
        
        allQuestions.forEach(q => {
            const lvlNum = q.level.match(/\d+/);
            const levelVal = lvlNum ? parseInt(lvlNum[0]) : 1;
            
            if (levelVal === 1) lvl1Total++;
            else if (levelVal === 2) lvl2Total++;
            else if (levelVal === 3) lvl3Total++;
            
            const ans = userAnswers[q.num];
            if (ans) {
                if (levelVal === 1) {
                    lvl1Answered++;
                    if (ans.isCorrect) lvl1Correct++;
                } else if (levelVal === 2) {
                    lvl2Answered++;
                    if (ans.isCorrect) lvl2Correct++;
                } else if (levelVal === 3) {
                    lvl3Answered++;
                    if (ans.isCorrect) lvl3Correct++;
                }
                
                if (ans.isCorrect) correctCount++;
            }
        });
        
        const incorrectCount = totalAnswered - correctCount;
        const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
        
        statsTotalAnswered.textContent = `${totalAnswered} / ${allQuestions.length}`;
        statsCorrectCount.textContent = correctCount;
        statsIncorrectCount.textContent = incorrectCount;
        statsAccuracy.textContent = `${accuracy}%`;
        
        // Levels Progress bars
        const pct1 = lvl1Total > 0 ? Math.round((lvl1Answered / lvl1Total) * 100) : 0;
        barLvl1.style.width = `${pct1}%`;
        txtLvl1.textContent = `${lvl1Answered}/${lvl1Total} (${pct1}%) - Точність: ${lvl1Answered > 0 ? Math.round((lvl1Correct/lvl1Answered)*100) : 0}%`;
        
        const pct2 = lvl2Total > 0 ? Math.round((lvl2Answered / lvl2Total) * 100) : 0;
        barLvl2.style.width = `${pct2}%`;
        txtLvl2.textContent = `${lvl2Answered}/${lvl2Total} (${pct2}%) - Точність: ${lvl2Answered > 0 ? Math.round((lvl2Correct/lvl2Answered)*100) : 0}%`;
        
        const pct3 = lvl3Total > 0 ? Math.round((lvl3Answered / lvl3Total) * 100) : 0;
        barLvl3.style.width = `${pct3}%`;
        txtLvl3.textContent = `${lvl3Answered}/${lvl3Total} (${pct3}%) - Точність: ${lvl3Answered > 0 ? Math.round((lvl3Correct/lvl3Answered)*100) : 0}%`;
    }
    
    function showQuiz() {
        statsScreen.classList.remove("active");
        quizScreen.classList.add("active");
        showQuestion();
    }
    
    function resetProgress() {
        if (confirm("Ви дійсно хочете скинути весь прогрес відповідей? Це не видалить збережені запитання.")) {
            userAnswers = {};
            localStorage.removeItem("quiz_answers");
            updateScoreboard();
            showQuiz();
        }
    }
    
    // Start App
    init();
});
