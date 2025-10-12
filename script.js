// Импортируем данные предметов из отдельного файла
import items from './items.js';

// Отладочная информация
console.log('Items загружены:', items);
console.log('Количество предметов:', Object.keys(items).length);
console.log('Первый предмет:', Object.keys(items)[0]);

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
 * Применяет принцип Single Responsibility - отвечает только за работу с URL
 */
class URLUtils {
    /**
     * Получает значение параметра из URL
     * @param {string} param - Название параметра
     * @returns {string|null} Значение параметра или null
     */
    static getURLParameter(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    /**
     * Устанавливает параметр в URL без перезагрузки страницы
     * @param {string} param - Название параметра
     * @param {string} value - Значение параметра
     */
    static setURLParameter(param, value) {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(param, value);
        } else {
            url.searchParams.delete(param);
        }
        window.history.pushState({}, '', url);
    }

    /**
     * Очищает все параметры из URL
     */
    static clearURLParameters() {
        const url = new URL(window.location);
        url.search = '';
        window.history.pushState({}, '', url);
    }

    /**
     * Получает все параметры поиска
     * @returns {Object} Объект с параметрами поиска
     */
    static getSearchParams() {
        return {
            query: this.getURLParameter(APP_CONFIG.SEARCH_PARAM_KEY) || '',
            page: parseInt(this.getURLParameter(APP_CONFIG.PAGE_PARAM_KEY)) || APP_CONFIG.DEFAULT_PAGE
        };
    }

    /**
     * Устанавливает параметры поиска
     * @param {string} query - Поисковый запрос
     * @param {number} page - Номер страницы (опционально)
     */
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
 * Применяет принцип Single Responsibility - отвечает только за обработку текста
 */
class TextUtils {
    /**
     * Подсвечивает совпадения в тексте
     * @param {string} text - Исходный текст
     * @param {string} query - Поисковый запрос
     * @param {string} className - CSS класс для подсветки
     * @returns {string} Текст с подсветкой
     */
    static highlightMatches(text, query, className = CSS_CLASSES.HIGHLIGHT) {
        if (!this.isValidText(text) || !this.isValidQuery(query)) {
            return text || '';
        }
        
        const escapedQuery = this.escapeRegExp(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return text.replace(regex, `<span class="${className}">$1</span>`);
    }

    /**
     * Очищает HTML теги и специальные символы из текста
     * @param {string} text - Исходный текст
     * @returns {string} Очищенный текст
     */
    static cleanText(text) {
        if (!this.isValidText(text)) {
            return '';
        }
        
        return this.applyTextCleaners(text);
    }

    /**
     * Проверяет валидность текста
     * @param {string} text - Текст для проверки
     * @returns {boolean} true если текст валиден
     */
    static isValidText(text) {
        return typeof text === 'string' && text.length > 0;
    }

    /**
     * Проверяет валидность поискового запроса
     * @param {string} query - Запрос для проверки
     * @returns {boolean} true если запрос валиден
     */
    static isValidQuery(query) {
        return typeof query === 'string' && query.trim().length > 0;
    }

    /**
     * Экранирует специальные символы для регулярных выражений
     * @param {string} string - Строка для экранирования
     * @returns {string} Экранированная строка
     */
    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Применяет все очистители текста
     * @param {string} text - Исходный текст
     * @returns {string} Очищенный текст
     */
    static applyTextCleaners(text) {
        const cleaners = [
            { pattern: /<[^>]*>/g, replacement: '' }, // HTML теги
            { pattern: /@UUID\[[^\]]*\]/g, replacement: '' }, // UUID ссылки
            { pattern: /@Trait\[[^\]]*\]/g, replacement: '' } // Trait ссылки
        ];

        return cleaners.reduce((cleanedText, cleaner) => {
            return cleanedText.replace(cleaner.pattern, cleaner.replacement);
        }, text).trim();
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
        console.log('ItemSearch.search вызван с запросом:', query);
        
        if (!this.isValidQuery(query)) {
            console.log('Невалидный запрос');
            return [];
        }
        
        const normalizedQuery = this.normalizeQuery(query);
        console.log('Нормализованный запрос:', normalizedQuery);
        console.log('Всего предметов для поиска:', Object.keys(this.items).length);
        
        const results = this.performSearch(normalizedQuery);
        console.log('Результаты поиска:', results);
        return results;
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
     * Выполняет поиск по нормализованному запросу
     * @param {string} normalizedQuery - Нормализованный запрос
     * @returns {Array} Результаты поиска
     */
    performSearch(normalizedQuery) {
        const items = Object.entries(this.items);
        const matchingItems = items.filter(([key, item]) => {
            return this.searchStrategies.some(strategy => 
                strategy(item, key, normalizedQuery)
            );
        });

        return this.mapToSearchResults(matchingItems);
    }

    /**
     * Поиск по названию предмета
     * @param {Object} item - Данные предмета
     * @param {string} key - Ключ предмета
     * @param {string} query - Поисковый запрос
     * @returns {boolean} true если найдено совпадение
     */
    searchByName(item, key, query) {
        const name = item.name || '';
        return name.toLowerCase().includes(query);
    }

    /**
     * Поиск по описанию предмета
     * @param {Object} item - Данные предмета
     * @param {string} key - Ключ предмета
     * @param {string} query - Поисковый запрос
     * @returns {boolean} true если найдено совпадение
     */
    searchByDescription(item, key, query) {
        const description = item.description || '';
        return description.toLowerCase().includes(query);
    }

    /**
     * Поиск по ключу предмета
     * @param {Object} item - Данные предмета
     * @param {string} key - Ключ предмета
     * @param {string} query - Поисковый запрос
     * @returns {boolean} true если найдено совпадение
     */
    searchByKey(item, key, query) {
        return key.toLowerCase().includes(query);
    }

    /**
     * Преобразует найденные предметы в формат результатов поиска
     * @param {Array} matchingItems - Найденные предметы
     * @returns {Array} Результаты поиска
     */
    mapToSearchResults(matchingItems) {
        return matchingItems.map(([key, item]) => ({
            key,
            name: item.name || '',
            description: item.description || ''
        }));
    }
}

/**
 * Класс для управления уведомлениями
 * Применяет принцип Single Responsibility - отвечает только за уведомления
 */
class NotificationManager {
    /**
     * Показывает уведомление пользователю
     * @param {string} message - Сообщение для показа
     * @param {string} type - Тип уведомления (success, error, warning)
     * @param {number} duration - Длительность показа в миллисекундах
     */
    static show(message, type = 'success', duration = APP_CONFIG.NOTIFICATION_DURATION) {
        const notification = this.createNotification(message, type);
        this.displayNotification(notification);
        this.scheduleRemoval(notification, duration);
    }

    /**
     * Создает элемент уведомления
     * @param {string} message - Сообщение
     * @param {string} type - Тип уведомления
     * @returns {HTMLElement} Элемент уведомления
     */
    static createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const styles = this.getNotificationStyles(type);
        Object.assign(notification.style, styles);
        
        return notification;
    }

    /**
     * Получает стили для уведомления
     * @param {string} type - Тип уведомления
     * @returns {Object} Стили
     */
    static getNotificationStyles(type) {
        const baseStyles = {
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
            color: 'white'
        };

        const typeStyles = {
            success: { backgroundColor: 'var(--success)' },
            error: { backgroundColor: 'var(--error)' },
            warning: { backgroundColor: 'var(--warning)' }
        };

        return { ...baseStyles, ...typeStyles[type] };
    }

    /**
     * Отображает уведомление на странице
     * @param {HTMLElement} notification - Элемент уведомления
     */
    static displayNotification(notification) {
        document.body.appendChild(notification);
    }

    /**
     * Планирует удаление уведомления
     * @param {HTMLElement} notification - Элемент уведомления
     * @param {number} duration - Длительность показа
     */
    static scheduleRemoval(notification, duration) {
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
    }

    /**
     * Удаляет уведомление с анимацией
     * @param {HTMLElement} notification - Элемент уведомления
     */
    static removeNotification(notification) {
        notification.style.animation = `slideOut ${APP_CONFIG.ANIMATION_DURATION}ms ease`;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, APP_CONFIG.ANIMATION_DURATION);
    }
}

/**
 * Класс для управления UI поиска
 * Применяет принцип Single Responsibility - отвечает только за UI
 */
class SearchUI {
    constructor(searchEngine) {
        console.log('SearchUI конструктор вызван');
        this.searchEngine = searchEngine;
        
        console.log('Ищем DOM элементы...');
        this.input = document.querySelector(DOM_SELECTORS.INPUT);
        this.button = document.querySelector(DOM_SELECTORS.BUTTON);
        this.resultDiv = document.querySelector(DOM_SELECTORS.RESULT);
        
        console.log('Найденные элементы:', {
            input: this.input,
            button: this.button,
            result: this.resultDiv
        });
        
        this.validateElements();
        this.init();
    }

    /**
     * Проверяет наличие необходимых DOM элементов
     */
    validateElements() {
        const requiredElements = [
            { element: this.input, name: 'input' },
            { element: this.button, name: 'button' },
            { element: this.resultDiv, name: 'result' }
        ];

        requiredElements.forEach(({ element, name }) => {
            if (!element) {
                console.error(`Не найден обязательный элемент: ${name}`);
                console.error(`Селектор: ${DOM_SELECTORS[name.toUpperCase()]}`);
                console.error('Доступные элементы:', document.querySelectorAll('*[id]'));
                throw new Error(`Не найден обязательный элемент: ${name}`);
            }
        });
    }

    /**
     * Инициализация UI
     */
    init() {
        console.log('SearchUI init вызван');
        this.bindEvents();
        this.loadFromURL();
        console.log('SearchUI инициализирован');
    }

    /**
     * Привязка обработчиков событий
     */
    bindEvents() {
        console.log('Привязываем обработчики событий...');
        
        // Обработка Enter в инпуте
        this.input.addEventListener('keydown', (e) => {
            console.log('Клавиша нажата:', e.key);
            if (e.key === 'Enter') {
                console.log('Enter нажат, выполняем поиск');
                this.performSearch();
            }
        });

        // Обработка клика по кнопке
        this.button.addEventListener('click', () => {
            console.log('Кнопка нажата, выполняем поиск');
            this.performSearch();
        });
        
        console.log('Обработчики событий привязаны');
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
        console.log('Выполняем поиск...');
        const query = this.input.value.trim();
        console.log('Поисковый запрос:', query);
        
        // Обновляем URL с параметром поиска
        URLUtils.setSearchParams(query);
        
        if (!query) {
            console.log('Пустой запрос, показываем пустое состояние');
            this.showEmptyState();
            return;
        }
        
        console.log('Ищем предметы...');
        const results = this.searchEngine.search(query);
        console.log('Найдено результатов:', results.length);
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
            <div class="search-results-header">
                <div class="results-info">
                    <span>Найдено предметов: ${results.length}</span>
                    <button class="share-button" onclick="window.shareResults('${query}')" title="Поделиться результатами поиска">
                        📤 Поделиться
                    </button>
                </div>
            </div>
        `;
        
        results.forEach(item => {
            html += this.createItemHTML(item, query);
        });
        
        this.resultDiv.innerHTML = html;
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
        const highlightedDescription = TextUtils.highlightMatches(cleanDescription, query, CSS_CLASSES.HIGHLIGHT_DESCRIPTION);
        
        const aonUrl = `https://2e.aonprd.com/Search.aspx?q=${encodeURIComponent(item.key)}`;
        const highlightedKey = TextUtils.highlightMatches(item.key, query, CSS_CLASSES.HIGHLIGHT);
        const clickableId = `<a href="${aonUrl}" target="_blank" title="Открыть в Archives of Nethys">${highlightedKey}</a>`;
        
        return `
            <div class="item-block">
                <div class="item-name">${highlightedName}</div>
                <div class="item-id">ID: ${clickableId}</div>
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
     * Поделиться результатами поиска
     * @param {string} query - Поисковый запрос
     */
    shareResults(query) {
        const url = window.location.href;
        
        if (navigator.share) {
            // Используем Web Share API если доступен
            navigator.share({
                title: `PF2E Item Search - Результаты поиска "${query}"`,
                text: `Найдены предметы Pathfinder 2E по запросу "${query}"`,
                url: url
            }).catch(err => {
                console.log('Ошибка при использовании Web Share API:', err);
                this.fallbackShare(url);
            });
        } else {
            // Fallback для браузеров без поддержки Web Share API
            this.fallbackShare(url);
        }
    }

    /**
     * Альтернативный способ поделиться (копирование в буфер обмена)
     * @param {string} url - URL для копирования
     */
    fallbackShare(url) {
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
 * Применяет принцип Dependency Injection и Facade Pattern
 */
class PF2ESearchApp {
    constructor() {
        this.searchEngine = new ItemSearch(items);
        this.ui = null;
        this.isInitialized = false;
    }

    /**
     * Инициализация приложения
     * Применяет принцип Single Responsibility - отвечает только за инициализацию
     */
    init() {
        if (this.isInitialized) {
            console.warn('Приложение уже инициализировано');
            return;
        }

        console.log('Инициализация PF2E Search App...');
        console.log('DOM готовность:', document.readyState);
        
        const initializeApp = () => {
            try {
                console.log('DOM загружен, инициализируем компоненты...');
                this.initializeComponents();
                this.setupGlobalHandlers();
                this.setupEventListeners();
                this.isInitialized = true;
                console.log('Приложение успешно инициализировано');
            } catch (error) {
                console.error('Ошибка при инициализации:', error);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            // DOM уже загружен
            initializeApp();
        }
    }

    /**
     * Инициализирует компоненты приложения
     */
    initializeComponents() {
        console.log('Создаем SearchUI...');
        this.ui = new SearchUI(this.searchEngine);
        console.log('SearchUI создан:', this.ui);
    }

    /**
     * Настраивает глобальные обработчики
     */
    setupGlobalHandlers() {
        // Делаем функции доступными глобально для onclick обработчиков
        window.shareResults = (query) => this.ui.shareResults(query);
        window.clearSearch = () => this.ui.clearSearch();
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventListeners() {
        // Обработка кнопки "Назад" в браузере
        window.addEventListener('popstate', () => {
            this.ui.loadFromURL();
        });
    }

    /**
     * Получает состояние приложения
     * @returns {Object} Состояние приложения
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            hasUI: this.ui !== null,
            hasSearchEngine: this.searchEngine !== null
        };
    }
}

// Инициализация приложения
const app = new PF2ESearchApp();
app.init();


