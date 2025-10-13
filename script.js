// Импортируем данные предметов из отдельного файла
import items from './newItems.js';


/**
 * Константы приложения
 * Применяет принцип DRY - централизованное хранение констант
 */
const APP_CONFIG = {
    NOTIFICATION_DURATION: 3000,
    SEARCH_PARAM_KEY: 'q',
    PAGE_PARAM_KEY: 'page',
    DEFAULT_PAGE: 1,
    ANIMATION_DURATION: 300
};

/**
 * Селекторы DOM элементов
 */
const DOM_SELECTORS = {
    INPUT: '#userInput',
    BUTTON: '#searchButton',
    RESULT: '#result'
};

/**
 * CSS классы
 */
const CSS_CLASSES = {
    HIGHLIGHT: 'highlight',
    HIGHLIGHT_NAME: 'highlight-name',
    HIGHLIGHT_DESCRIPTION: 'highlight-description',
    NOTIFICATION: 'notification'
};

/**
 * Утилиты для работы с URL параметрами
 */
class URLUtils {
    static getURLParameter(param) {
        return new URLSearchParams(window.location.search).get(param);
    }

    static setURLParameter(param, value) {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(param, value);
        } else {
            url.searchParams.delete(param);
        }
        window.history.pushState({}, '', url);
    }

    static clearURLParameters() {
        const url = new URL(window.location);
        url.search = '';
        window.history.pushState({}, '', url);
    }

    static getSearchParams() {
        return {
            query: this.getURLParameter(APP_CONFIG.SEARCH_PARAM_KEY) || '',
            page: parseInt(this.getURLParameter(APP_CONFIG.PAGE_PARAM_KEY)) || APP_CONFIG.DEFAULT_PAGE
        };
    }

    static setSearchParams(query, page = APP_CONFIG.DEFAULT_PAGE) {
        this.setURLParameter(APP_CONFIG.SEARCH_PARAM_KEY, query);
        if (page > APP_CONFIG.DEFAULT_PAGE) {
            this.setURLParameter(APP_CONFIG.PAGE_PARAM_KEY, page.toString());
        } else {
            this.setURLParameter(APP_CONFIG.PAGE_PARAM_KEY, '');
        }
    }
}

/**
 * Утилиты для работы с текстом и поиском
 */
class TextUtils {
    static highlightMatches(text, query, className = CSS_CLASSES.HIGHLIGHT) {
        if (!text || !query) return text || '';
        
        const queryWords = query.split(/\s+/).filter(word => word.length > 1);
        let highlightedText = text;
        
        queryWords.forEach(word => {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedWord})`, 'gi');
            highlightedText = highlightedText.replace(regex, `<span class="${className}">$1</span>`);
        });
        
        return highlightedText;
    }

    static cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/<[^>]*>/g, '') // HTML теги
            .replace(/@UUID\[[^\]]*\]/g, '') // UUID ссылки
            .replace(/@Trait\[[^\]]*\]/g, '') // Trait ссылки
            .trim();
    }
}

/**
 * Класс для поиска предметов
 * Применяет принцип Single Responsibility - отвечает только за поиск
 */
class ItemSearch {
    constructor(items) {
        this.items = items;
        this.searchStrategies = [
            this.searchByName.bind(this),
            this.searchByNameRus.bind(this),
            this.searchByDescription.bind(this),
            this.searchByKey.bind(this)
        ];
    }

    /**
     * Выполняет поиск предметов по запросу
     * @param {string} query - Поисковый запрос
     * @returns {Array} Массив найденных предметов
     */
    search(query) {
        if (!this.isValidQuery(query)) {
            return [];
        }
        
        const normalizedQuery = this.normalizeQuery(query);
        
        // Проверяем, является ли запрос осмысленным
        if (!this.isMeaningfulQuery(normalizedQuery)) {
            return [];
        }
        
        return this.performSearch(normalizedQuery);
    }

    /**
     * Проверяет валидность поискового запроса
     * @param {string} query - Запрос для проверки
     * @returns {boolean} true если запрос валиден
     */
    isValidQuery(query) {
        return typeof query === 'string' && query.trim().length > 0;
    }

    /**
     * Нормализует поисковый запрос
     * @param {string} query - Исходный запрос
     * @returns {string} Нормализованный запрос
     */
    normalizeQuery(query) {
        return query.trim().toLowerCase();
    }

    /**
     * Проверяет, является ли запрос осмысленным
     * @param {string} query - Нормализованный запрос
     * @returns {boolean} true если запрос осмысленный
     */
    isMeaningfulQuery(query) {
        // Проверяем длину запроса
        if (query.length < 2) {
            return false;
        }
        
        // Проверяем, не является ли запрос случайным набором символов
        if (this.isRandomString(query)) {
            return false;
        }
        
        // Проверяем, содержит ли запрос хотя бы одну букву
        if (!/[а-яёa-z]/.test(query)) {
            return false;
        }
        
        return true;
    }

    /**
     * Проверяет, является ли строка случайным набором символов
     * @param {string} str - Строка для проверки
     * @returns {boolean} true если строка выглядит как случайная
     */
    isRandomString(str) {
        // Проверяем повторяющиеся символы (более 3 одинаковых подряд)
        if (/(.)\1{3,}/.test(str)) {
            return true;
        }
        
        // Проверяем чередование символов (ававава, ывывыв)
        if (/(.)(.)\1\2\1/.test(str)) {
            return true;
        }
        
        // Проверяем слишком много согласных подряд (более 4)
        if (/[бвгджзклмнпрстфхцчшщ]{5,}/.test(str)) {
            return true;
        }
        
        // Проверяем слишком много гласных подряд (более 3)
        if (/[аеёиоуыэюя]{4,}/.test(str)) {
            return true;
        }
        
        return false;
    }

    /**
     * Выполняет поиск по нормализованному запросу
     * @param {string} normalizedQuery - Нормализованный запрос
     * @returns {Array} Результаты поиска
     */
    performSearch(normalizedQuery) {
        const items = Array.isArray(this.items) ? this.items : Object.entries(this.items);
        const matchingItems = items.filter((item) => {
            // Если items - массив, item уже является объектом
            // Если items - объект, item это [key, value]
            const itemData = Array.isArray(this.items) ? item : item[1];
            const itemKey = Array.isArray(this.items) ? item._id : item[0];
            
            return this.searchStrategies.some(strategy => 
                strategy(itemData, itemKey, normalizedQuery)
            );
        });

        // Ранжируем и ограничиваем результаты
        const rankedItems = this.rankResults(matchingItems, normalizedQuery);
        return this.mapToSearchResults(rankedItems.slice(0, 50));
    }

    /**
     * Ранжирует результаты поиска по релевантности
     * @param {Array} items - Найденные предметы
     * @param {string} query - Поисковый запрос
     * @returns {Array} Отранжированные результаты
     */
    rankResults(items, query) {
        return items.sort((itemA, itemB) => {
            // Если items - массив, item уже является объектом
            // Если items - объект, item это [key, value]
            const itemDataA = Array.isArray(this.items) ? itemA : itemA[1];
            const itemKeyA = Array.isArray(this.items) ? itemA._id : itemA[0];
            const itemDataB = Array.isArray(this.items) ? itemB : itemB[1];
            const itemKeyB = Array.isArray(this.items) ? itemB._id : itemB[0];
            
            const scoreA = this.calculateRelevanceScore(itemDataA, itemKeyA, query);
            const scoreB = this.calculateRelevanceScore(itemDataB, itemKeyB, query);
            return scoreB - scoreA; // Сортируем по убыванию релевантности
        });
    }

    /**
     * Подсчитывает количество вхождений запроса в тексте
     * @param {string} text - Текст для поиска
     * @param {string} query - Поисковый запрос
     * @returns {number} Количество вхождений
     */
    countMatches(text, query) {
        if (!text || !query) return 0;
        
        // Подсчитываем точные вхождения
        const exactMatches = (text.match(new RegExp(this.escapeRegExp(query), 'gi')) || []).length;
        
        // Подсчитываем вхождения по словам (для многословных запросов)
        const queryWords = query.split(/\s+/).filter(word => word.length > 0);
        let wordMatches = 0;
        
        queryWords.forEach(word => {
            const matches = (text.match(new RegExp(this.escapeRegExp(word), 'gi')) || []).length;
            wordMatches += matches;
        });
        
        // Возвращаем максимум из точных совпадений и совпадений по словам
        return Math.max(exactMatches, wordMatches);
    }

    /**
     * Экранирует специальные символы для регулярных выражений
     * @param {string} string - Строка для экранирования
     * @returns {string} Экранированная строка
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Вычисляет релевантность предмета для запроса
     * @param {Object} item - Данные предмета
     * @param {string} key - Ключ предмета
     * @param {string} query - Поисковый запрос
     * @returns {number} Оценка релевантности
     */
    calculateRelevanceScore(item, key, query) {
        let score = 0;
        const queryLower = query.toLowerCase();
        
        // Формируем единый текст для подсчётов
        const combinedText = [
            (item.name || ''),
            (item.nameRus || ''),
            key,
            (item.description || '')
        ].join(' ').toLowerCase();
        
        // 1) Полные совпадения фразы - высший приоритет
        const exactPhraseCount = this.countOccurrences(combinedText, queryLower);
        if (exactPhraseCount > 0) {
            score += exactPhraseCount * 1000;
        }
        
        // 2) Разбиваем запрос на слова и сортируем по длине
        const queryWords = queryLower.split(/\s+/)
            .filter(word => word.length > 1) // убираем однобуквенные
            .sort((a, b) => b.length - a.length); // сортируем по убыванию длины
        
        // 3) Взвешиваем по длине слова и позиции
        queryWords.forEach((word, index) => {
            const occurrences = this.countOccurrences(combinedText, word);
            if (occurrences > 0) {
                // Чем длиннее слово и чем раньше в отсортированном списке - тем больше вес
                const wordWeight = word.length * (queryWords.length - index + 1) * 10;
                score += occurrences * wordWeight;
            }
        });
        
        return score;
    }

    // Подсчёт вхождений подстроки (неперекрывающиеся), регистронезависимый текст заранее приведён к lowerCase
    countOccurrences(text, term) {
        if (!text || !term) return 0;
        const regex = new RegExp(this.escapeRegExp(term), 'g');
        const matches = text.match(regex);
        return matches ? matches.length : 0;
    }

    /**
     * Поиск по названию предмета
     */
    searchByName(item, key, query) {
        return item.name && this.fuzzySearch(item.name, query);
    }

    /**
     * Поиск по русскому названию предмета
     */
    searchByNameRus(item, key, query) {
        return item.nameRus && this.fuzzySearch(item.nameRus, query);
    }

    /**
     * Поиск по описанию предмета
     */
    searchByDescription(item, key, query) {
        return item.description && this.fuzzySearch(item.description, query);
    }

    /**
     * Поиск по ключу предмета
     */
    searchByKey(item, key, query) {
        return key && this.fuzzySearch(key, query);
    }


    /**
     * Нечеткий поиск - ищет по отдельным словам
     */
    fuzzySearch(text, query) {
        if (!text || !query) return false;
        
        const textLower = text.toLowerCase();
        const queryWords = query.split(/\s+/).filter(word => word.length >= 2);
        
        // Если нет слов для поиска, возвращаем false
        if (queryWords.length === 0) {
            return false;
        }
        
        return queryWords.every(word => {
            // Точное совпадение
            if (textLower.includes(word)) return true;
            
            // Частичное совпадение только для слов длиннее 4 символов
            if (word.length > 4) {
                return textLower.split(/\s+/).some(textWord => {
                    // Проверяем, что совпадение достаточно значимое
                    const minLength = Math.min(word.length, textWord.length);
                    const maxLength = Math.max(word.length, textWord.length);
                    const similarity = minLength / maxLength;
                    
                    return (textWord.startsWith(word) || word.startsWith(textWord)) && 
                           similarity >= 0.6; // Минимум 60% совпадения
                });
            }
            return false;
        });
    }

    /**
     * Преобразует найденные предметы в формат результатов поиска
     * @param {Array} matchingItems - Найденные предметы
     * @returns {Array} Результаты поиска
     */
    mapToSearchResults(matchingItems) {
        return matchingItems.map((item) => {
            // Если items - массив, item уже является объектом
            // Если items - объект, item это [key, value]
            const itemData = Array.isArray(this.items) ? item : item[1];
            const itemKey = Array.isArray(this.items) ? item._id : item[0];
            
            return {
                ...itemData,
                key: itemKey
            };
        });
    }
}

/**
 * Класс для управления уведомлениями
 */
class NotificationManager {
    static show(message, type = 'success', duration = APP_CONFIG.NOTIFICATION_DURATION) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Стили уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: 'var(--border-radius)',
            zIndex: '1000',
            fontWeight: '500',
            boxShadow: '0 4px 12px var(--shadow-hover)',
            animation: 'slideIn 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word',
            color: 'white',
            backgroundColor: type === 'success' ? 'var(--success)' : 
                           type === 'error' ? 'var(--error)' : 'var(--warning)'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = `slideOut ${APP_CONFIG.ANIMATION_DURATION}ms ease`;
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, APP_CONFIG.ANIMATION_DURATION);
        }, duration);
    }
}

/**
 * Класс для управления UI поиска
 * Применяет принцип Single Responsibility - отвечает только за UI
 */
class SearchUI {
    constructor(searchEngine) {
        this.searchEngine = searchEngine;
        this.input = document.querySelector(DOM_SELECTORS.INPUT);
        this.button = document.querySelector(DOM_SELECTORS.BUTTON);
        this.resultDiv = document.querySelector(DOM_SELECTORS.RESULT);
        
        if (!this.input || !this.button || !this.resultDiv) {
            throw new Error('Не найдены обязательные DOM элементы');
        }
        
        this.init();
    }

    /**
     * Инициализация UI
     */
    init() {
        this.bindEvents();
        this.loadFromURL();
    }

    /**
     * Привязка обработчиков событий
     */
    bindEvents() {
        // Обработка Enter в инпуте
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });

        // Обработка клика по кнопке
        this.button.addEventListener('click', () => {
            this.performSearch();
        });
    }

    /**
     * Загружает поисковый запрос из URL при инициализации
     */
    loadFromURL() {
        const params = URLUtils.getSearchParams();
        if (params.query) {
            this.input.value = params.query;
            this.performSearch();
        }
    }

    /**
     * Выполняет поиск и отображает результаты
     */
    performSearch() {
        const query = this.input.value.trim();
        
        // Обновляем URL с параметром поиска
        URLUtils.setSearchParams(query);
        
        if (!query) {
            this.showEmptyState();
            return;
        }
        
        const results = this.searchEngine.search(query);
        this.displayResults(results, query);
    }

    /**
     * Отображает пустое состояние
     */
    showEmptyState() {
        this.resultDiv.innerHTML = `
            <div class="welcome-message">
                <h2>Добро пожаловать!</h2>
                <p>Введите поисковый запрос выше, чтобы найти предметы из Pathfinder 2E.</p>
                <div class="search-tips">
                    <h3>Советы по поиску:</h3>
                    <ul>
                        <li>Ищите по названию предмета</li>
                        <li>Используйте ключевые слова из описания</li>
                        <li>Попробуйте искать по типу предмета (оружие, броня, зелье)</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Отображает результаты поиска
     * @param {Array} results - Результаты поиска
     * @param {string} query - Поисковый запрос
     */
    displayResults(results, query) {
        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }
        
        let html = `
            <div class="share-section">
                <button class="share-button" onclick="window.shareResults('${query}')" title="Скопировать ссылку с результатами поиска">
                    📤 Скопировать ссылку
                </button>
            </div>
        `;
        
        results.forEach(item => {
            html += this.createItemHTML(item, query);
        });
        
        this.resultDiv.innerHTML = html;
    }

    /**
     * Форматирует цену предмета
     * @param {Object} priceValue - Объект с ценой
     * @returns {string} Отформатированная цена
     */
    formatPrice(priceValue) {
        if (!priceValue || Object.keys(priceValue).length === 0) {
            return '—';
        }
        
        const priceParts = [];
        for (const [currency, amount] of Object.entries(priceValue)) {
            if (amount > 0) {
                priceParts.push(`${amount} ${currency.toUpperCase()}`);
            }
        }
        
        return priceParts.length > 0 ? priceParts.join(', ') : '—';
    }

    /**
     * Создает HTML для одного предмета
     * @param {Object} item - Данные предмета
     * @param {string} query - Поисковый запрос
     * @returns {string} HTML строка
     */
    createItemHTML(item, query) {
        const cleanDescription = TextUtils.cleanText(item.description);
        const highlightedName = TextUtils.highlightMatches(item.name, query, CSS_CLASSES.HIGHLIGHT_NAME);
        const highlightedNameRus = TextUtils.highlightMatches(item.nameRus || '', query, CSS_CLASSES.HIGHLIGHT_NAME);
        const highlightedDescription = TextUtils.highlightMatches(cleanDescription, query, CSS_CLASSES.HIGHLIGHT_DESCRIPTION);
        
        const aonUrl = `https://2e.aonprd.com/Search.aspx?q=${encodeURIComponent(item._id)}`;
        const highlightedId = TextUtils.highlightMatches(item._id, query, CSS_CLASSES.HIGHLIGHT);
        const clickableId = `<a href="${aonUrl}" target="_blank" title="Открыть в Archives of Nethys">${highlightedId}</a>`;
        
        // Форматируем цену
        const priceValue = item.system?.price?.value;
        const priceText = priceValue ? this.formatPrice(priceValue) : '—';
        
        // Получаем уровень
        const level = item.system?.level?.value || '—';
        
        return `
            <div class="item-block">
                <div class="item-header">
                    <div class="item-name">${highlightedName}</div>
                    <div class="item-level">Уровень: ${level}</div>
                </div>
                ${item.nameRus ? `<div class="item-name-rus">${highlightedNameRus}</div>` : ''}
                <div class="item-id">ID: ${clickableId}</div>
                <div class="item-price">Цена: ${priceText}</div>
                <div class="item-description">${highlightedDescription}</div>
            </div>
        `;
    }

    /**
     * Отображает сообщение об отсутствии результатов
     * @param {string} query - Поисковый запрос
     */
    showNoResults(query) {
        this.resultDiv.innerHTML = `
            <div class="no-results">
                <strong>Предметы не найдены</strong><br>
                По запросу "${query}" ничего не найдено. Попробуйте изменить поисковый запрос.
                <div class="no-results-actions">
                    <button class="clear-search-button" onclick="window.clearSearch()" title="Очистить поиск">
                        🗑️ Очистить поиск
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Копирует ссылку с результатами поиска в буфер обмена
     * @param {string} query - Поисковый запрос
     */
    shareResults(query) {
        const url = window.location.href;
        
        navigator.clipboard.writeText(url).then(() => {
            NotificationManager.show('Ссылка скопирована в буфер обмена!', 'success');
        }).catch(err => {
            console.error('Ошибка при копировании:', err);
            NotificationManager.show('Не удалось скопировать ссылку', 'error');
        });
    }

    /**
     * Очищает поиск и возвращает к начальному состоянию
     */
    clearSearch() {
        this.input.value = '';
        URLUtils.clearURLParameters();
        this.showEmptyState();
    }

}

/**
 * Главный класс приложения
 */
class PF2ESearchApp {
    constructor() {
        this.searchEngine = new ItemSearch(items);
        this.ui = null;
    }

    init() {
        const initializeApp = () => {
            try {
                this.ui = new SearchUI(this.searchEngine);
                this.setupGlobalHandlers();
                this.setupEventListeners();
            } catch (error) {
                console.error('Ошибка при инициализации:', error);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }
    }

    setupGlobalHandlers() {
        window.shareResults = (query) => this.ui.shareResults(query);
        window.clearSearch = () => this.ui.clearSearch();
    }

    setupEventListeners() {
        window.addEventListener('popstate', () => {
            this.ui.loadFromURL();
        });
    }
}

// Инициализация приложения
const app = new PF2ESearchApp();
app.init();


