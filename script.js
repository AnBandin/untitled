// Импортируем данные предметов из отдельного файла
import items from './items.js';

/**
 * Упрощенный поисковик предметов PF2E
 * Основной класс приложения - объединяет поиск и UI
 */
class PF2ESearchApp {
    constructor() {
        this.items = items;
<<<<<<< HEAD
        this.cache = new Map(); // Простое кэширование результатов
=======
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

        // Тексты для разных приоритетов
        const titleText = [
            (item.name || ''),
            (item.nameRus || '')
        ].join(' ').toLowerCase();
        const descriptionText = (item.description || '').toLowerCase();
        const combinedText = [titleText, key ? String(key).toLowerCase() : '', descriptionText]
            .join(' ').trim();

        // 1) Точное совпадение всей фразы (как отдельной словоформы) в любом поле — максимальный приоритет
        const exactAnywhere = this.countWholePhraseOccurrencesUnicode(combinedText, queryLower);
        if (exactAnywhere > 0) {
            // Большой коэффициент, чтобы гарантировать приоритет над остальными
            score += exactAnywhere * 1000000;
        }

        // 2) Совпадение фразы в заголовке (name/nameRus)
        const exactInTitle = this.countWholePhraseOccurrencesUnicode(titleText, queryLower);
        if (exactInTitle > 0) {
            score += exactInTitle * 10000;
        }

        // 3) Совпадение фразы в описании и их количество
        const exactInDescription = this.countWholePhraseOccurrencesUnicode(descriptionText, queryLower);
        if (exactInDescription > 0) {
            score += exactInDescription * 100;
        }

        // 4) Если фраза является подстрокой (без учёта границ слова) — лёгкий бонус как самый низкий приоритет
        if (queryLower && combinedText.includes(queryLower)) {
            score += 1;
        }

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
     * Подсчитывает точные вхождения целой фразы с учётом «словоподобных» границ для Unicode.
     * Работает регистронезависимо, ожидается, что text и phrase уже приведены к lowerCase.
     * Границы определяются как не-буквенно-цифровые символы (по Unicode), либо начало/конец строки.
     * @param {string} text
     * @param {string} phrase
     * @returns {number}
     */
    countWholePhraseOccurrencesUnicode(text, phrase) {
        if (!text || !phrase) return 0;
        const escaped = this.escapeRegExp(phrase);
        // Используем окрестности, чтобы имитировать границы слова для Unicode без lookbehind
        // Матч считается валидным, если слева граница (^ или не буква/цифра),
        // а справа конец строки или не буква/цифра
        const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])(${escaped})(?=[^\\p{L}\\p{N}]|$)`, 'gu');
        let count = 0;
        while (regex.exec(text) !== null) {
            count += 1;
        }
        return count;
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
            // 1. Точное совпадение подстроки - самый надежный способ
            if (textLower.includes(word)) {
                return true;
            }
            
            // 2. Поиск по словам в тексте для частичных совпадений
            const textWords = textLower.split(/\s+/);
            
            // Для коротких слов (2-3 символа) ищем только точные совпадения
            if (word.length <= 3) {
                return textWords.includes(word);
            }
            
            // Для длинных слов (4+ символа) ищем частичные совпадения
            return textWords.some(textWord => {
                // Проверяем, что одно слово начинается с другого
                if (textWord.startsWith(word) || word.startsWith(textWord)) {
                    return true;
                }
                
                // Проверяем схожесть для более гибкого поиска
                const minLength = Math.min(word.length, textWord.length);
                const maxLength = Math.max(word.length, textWord.length);
                const similarity = minLength / maxLength;
                
                return similarity >= 0.6; // Минимум 60% совпадения
            });
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
        this.maxLevelInput = document.querySelector(DOM_SELECTORS.MAX_LEVEL_INPUT);
        this.maxPriceInput = document.querySelector(DOM_SELECTORS.MAX_PRICE_INPUT);
        this.clearFilters = document.querySelector(DOM_SELECTORS.CLEAR_FILTERS);
        this.sortByPrice = document.querySelector(DOM_SELECTORS.SORT_BY_PRICE);
        this.ppValue = document.querySelector(DOM_SELECTORS.PP_VALUE);
        this.spValue = document.querySelector(DOM_SELECTORS.SP_VALUE);
        this.cpValue = document.querySelector(DOM_SELECTORS.CP_VALUE);
        
        if (!this.input || !this.button || !this.resultDiv) {
            throw new Error('Не найдены обязательные DOM элементы');
        }
        
        this.filters = {
            maxLevel: 20,
            maxPrice: 100, // в GP
            sortByPrice: false,
            sortDirection: 'asc' // 'asc' для возрастания, 'desc' для убывания
        };
        
>>>>>>> parent of fe212bd (Add debug logging for fuzzy search in ItemSearch: Introduce console logs to trace the search process when the query is "руна". This aids in debugging by providing insights into the matching logic and results for both short and long words, enhancing the development experience.)
        this.init();
    }

    /**
     * Инициализация приложения
     */
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Настройка приложения
     */
    setup() {
        this.input = document.querySelector('#userInput');
        this.button = document.querySelector('#searchButton');
        this.resultDiv = document.querySelector('#result');
        this.maxLevelInput = document.querySelector('#maxLevelInput');
        this.maxPriceInput = document.querySelector('#maxPriceInput');
        
        if (!this.input || !this.button || !this.resultDiv) {
            console.error('Не найдены обязательные DOM элементы');
            return;
        }

        this.bindEvents();
        this.loadFromURL();
    }

    /**
     * Привязка обработчиков событий
     */
    bindEvents() {
        // Поиск по Enter
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });

        // Поиск по клику
        this.button.addEventListener('click', () => this.performSearch());

        // Фильтры
        if (this.maxLevelInput) {
            this.maxLevelInput.addEventListener('input', () => this.performSearch());
        }
        if (this.maxPriceInput) {
            this.maxPriceInput.addEventListener('input', () => this.performSearch());
        }
    }

    /**
     * Загрузка поискового запроса из URL
     */
    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            this.input.value = query;
            this.performSearch();
        }
    }

    /**
     * Выполнение поиска
     */
    performSearch() {
        const query = this.input.value.trim();
        
        // Обновляем URL
        this.updateURL(query);
        
        if (!query) {
            this.showWelcome();
            return;
        }

        const results = this.searchItems(query);
        this.displayResults(results, query);
    }

    /**
     * Упрощенный поиск предметов
     */
    searchItems(query) {
        if (!query || query.length < 2) return [];

        // Проверяем кэш
        if (this.cache.has(query)) {
            return this.cache.get(query);
        }

        const normalizedQuery = query.toLowerCase().trim();
        
        // items - это массив объектов, поэтому работаем напрямую с ним
        const results = this.items.filter(item => {
            const searchText = [
                item.name || '',
                item.nameRus || '',
                item.description || '',
                item._id || ''
            ].join(' ').toLowerCase();
            
            return searchText.includes(normalizedQuery);
        }); // Ограничиваем результаты

        // Применяем фильтры
        const filteredResults = this.applyFilters(results);
        
        // Кэшируем результат
        this.cache.set(query, filteredResults);
        
        return filteredResults;
    }

    /**
     * Применение простых фильтров
     */
    applyFilters(results) {
        let filtered = results;

        // Фильтр по уровню
        const maxLevel = parseInt(this.maxLevelInput?.value) || 20;
        filtered = filtered.filter(item => {
            const level = item.system?.level?.value;
            return level === null || level === undefined || level <= maxLevel;
        });

        // Фильтр по цене
        const maxPrice = parseInt(this.maxPriceInput?.value) || 100;
        filtered = filtered.filter(item => {
            const price = item.system?.price?.value;
            if (!price) return true;
            
            const priceInGP = this.convertPriceToGP(price);
            return priceInGP <= maxPrice;
        });

        return filtered;
    }

    /**
     * Конвертация цены в GP
     */
    convertPriceToGP(priceValue) {
        let totalGP = 0;
        if (priceValue.pp) totalGP += priceValue.pp * 10;
        if (priceValue.gp) totalGP += priceValue.gp;
        if (priceValue.sp) totalGP += priceValue.sp * 0.1;
        if (priceValue.cp) totalGP += priceValue.cp * 0.01;
        return totalGP;
    }

    /**
     * Отображение результатов
     */
    displayResults(results, query) {
        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }

        let html = '';
        results.forEach(item => {
            html += this.createItemHTML(item, query);
        });
        
        this.resultDiv.innerHTML = html;
    }

    /**
     * Создание HTML для предмета
     */
    createItemHTML(item, query) {
        const cleanDescription = this.cleanText(item.description || '');
        const highlightedName = this.highlightText(item.name || '', query);
        const highlightedNameRus = this.highlightText(item.nameRus || '', query);
        const highlightedDescription = this.highlightText(cleanDescription, query);
        
        const aonUrl = `https://2e.aonprd.com/Search.aspx?q=${encodeURIComponent(item.name)}`;
        const level = item.system?.level?.value || '—';
        const price = this.formatPrice(item.system?.price?.value);
        
        return `
            <div class="item-block">
                <div class="item-name-level">
                    ${item.nameRus ? `<div class="item-name">${highlightedNameRus}</div>` : ''}
                    <div class="item-id">ID: <a href="${aonUrl}" target="_blank" class="item-id-link">${highlightedName}</a></div>
                </div>
                <div class="item-id-price">
                    <div class="item-level">Уровень: ${level}</div>
                    <div class="item-price">Цена: ${price}</div>
                </div>
                <div class="item-description">${highlightedDescription}</div>
            </div>
        `;
    }

    /**
     * Подсветка текста
     */
    highlightText(text, query) {
        if (!text || !query) return text || '';
        
        const queryWords = query.split(/\s+/).filter(word => word.length > 1);
        let highlightedText = text;
        
        queryWords.forEach(word => {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedWord})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
        });
        
        return highlightedText;
    }

    /**
     * Очистка текста от HTML тегов
     */
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/@UUID\[[^\]]*\]/g, '')
            .replace(/@Trait\[[^\]]*\]/g, '')
            .trim();
    }

    /**
     * Форматирование цены
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
     * Отображение приветствия
     */
    showWelcome() {
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
     * Отображение отсутствия результатов
     */
    showNoResults(query) {
        this.resultDiv.innerHTML = `
            <div class="no-results">
                <strong>Предметы не найдены</strong><br>
                По запросу "${query}" ничего не найдено. Попробуйте изменить поисковый запрос.
            </div>
        `;
    }

    /**
     * Обновление URL
     */
    updateURL(query) {
        const url = new URL(window.location);
        if (query) {
            url.searchParams.set('q', query);
        } else {
            url.searchParams.delete('q');
        }
        window.history.pushState({}, '', url);
    }
}

// Инициализация упрощенного приложения
const app = new PF2ESearchApp();


