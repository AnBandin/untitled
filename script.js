// Импортируем данные предметов из отдельного файла
import items from './items.js';


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
    RESULT: '#result',
    MAX_LEVEL_INPUT: '#maxLevelInput',
    MAX_PRICE_INPUT: '#maxPriceInput',
    CLEAR_FILTERS: '#clearFilters',
    SORT_BY_PRICE: '#sortByPrice',
    PP_VALUE: '#ppValue',
    SP_VALUE: '#spValue',
    CP_VALUE: '#cpValue'
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
    }

    /**
     * Выполняет поиск предметов по запросу
     * @param {string} query - Поисковый запрос
     * @returns {Array} Массив найденных предметов
     */
    search(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        
        const normalizedQuery = query.trim().toLowerCase();
        return this.performSearch(normalizedQuery);
    }


    /**
     * Выполняет многоуровневый поиск по нормализованному запросу
     * @param {string} normalizedQuery - Нормализованный запрос
     * @returns {Array} Результаты поиска
     */
    performSearch(normalizedQuery) {
        const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
        
        // 1. Поиск по полной фразе (максимальный приоритет)
        const exactMatches = this.items.filter(item => {
            const name = (item.name || '').toLowerCase();
            const nameRus = (item.nameRus || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            
            return name.includes(normalizedQuery) || 
                   nameRus.includes(normalizedQuery) || 
                   description.includes(normalizedQuery);
        });

        // 2. Поиск по отдельным словам (если есть несколько слов)
        const wordMatches = [];
        if (queryWords.length > 1) {
            queryWords.forEach((word, index) => {
                const matches = this.items.filter(item => {
                    const name = (item.name || '').toLowerCase();
                    const nameRus = (item.nameRus || '').toLowerCase();
                    const description = (item.description || '').toLowerCase();
                    
                    return name.includes(word) || 
                           nameRus.includes(word) || 
                           description.includes(word);
                });
                
                // Добавляем приоритет: первое слово важнее второго и т.д.
                matches.forEach(match => {
                    if (!wordMatches.some(existing => existing.item === match)) {
                        wordMatches.push({
                            item: match,
                            priority: queryWords.length - index // Первое слово = высший приоритет
                        });
                    }
                });
            });
        }

        // Объединяем результаты с приоритетами
        const allResults = [];
        
        // Добавляем точные совпадения с максимальным приоритетом
        exactMatches.forEach(item => {
            allResults.push({
                item: item,
                priority: 1000 // Максимальный приоритет для точных совпадений
            });
        });
        
        // Добавляем совпадения по словам
        allResults.push(...wordMatches);
        
        // Убираем дубликаты и сортируем по приоритету
        const uniqueResults = [];
        const seenItems = new Set();
        
        allResults
            .sort((a, b) => b.priority - a.priority) // Сортируем по убыванию приоритета
            .forEach(result => {
                if (!seenItems.has(result.item._id)) {
                    seenItems.add(result.item._id);
                    uniqueResults.push(result.item);
                }
            });

        return uniqueResults;
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
        
        this.init();
    }

    /**
     * Инициализация UI
     */
    init() {
        this.bindEvents();
        this.updatePriceConverter(); // Инициализируем конвертер
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

        // Обработка input максимального уровня
        if (this.maxLevelInput) {
            this.maxLevelInput.addEventListener('input', () => {
                this.updateLevelFilter();
                this.performSearch();
            });
        }

        // Обработка input максимальной цены
        if (this.maxPriceInput) {
            this.maxPriceInput.addEventListener('input', () => {
                this.updatePriceFilter();
                this.updatePriceConverter();
                this.performSearch();
            });
        }

        // Обработка сортировки по цене
        if (this.sortByPrice) {
            this.sortByPrice.addEventListener('click', () => {
                this.togglePriceSort();
                this.performSearch();
            });
        }

        // Обработка очистки фильтров
        if (this.clearFilters) {
            this.clearFilters.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
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
        const filteredResults = this.applyFilters(results);
        this.displayResults(filteredResults, query);
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
        
        const aonUrl = `https://2e.aonprd.com/Search.aspx?q=${encodeURIComponent(item.name)}`;
        const highlightedId = TextUtils.highlightMatches(item.name, query, CSS_CLASSES.HIGHLIGHT);
        const clickableId = `<a href="${aonUrl}" target="_blank" title="Открыть в Archives of Nethys" class="item-id-link">${highlightedId}</a>`;
        
        // Форматируем цену
        const priceValue = item.system?.price?.value;
        const priceText = priceValue ? this.formatPrice(priceValue) : '—';
        
        // Получаем уровень
        const level = item.system?.level?.value || '—';
        
        return `
            <div class="item-block">
                <div class="item-name-level">
                    ${item.nameRus ? `<div class="item-name">${highlightedNameRus}</div>` : ''}
                    <div class="item-id">ID: ${clickableId}</div>
                </div>
                <div class="item-id-price">
                    <div class="item-level">Уровень: ${level}</div>
                    <div class="item-price">Цена: ${priceText}</div>
                </div>
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
     * Обновляет фильтр максимального уровня
     */
    updateLevelFilter() {
        if (this.maxLevelInput) {
            this.filters.maxLevel = parseInt(this.maxLevelInput.value) || 20;
        }
    }

    /**
     * Обновляет фильтр максимальной цены
     */
    updatePriceFilter() {
        if (this.maxPriceInput) {
            this.filters.maxPrice = parseInt(this.maxPriceInput.value) || 100;
        }
    }

    /**
     * Обновляет отображение конвертера валют
     */
    updatePriceConverter() {
        const gpValue = parseInt(this.maxPriceInput?.value) || 100;
        
        // Конвертируем GP в другие валюты
        const ppValue = Math.round(gpValue / 10 * 100) / 100; // 1 PP = 10 GP
        const spValue = Math.round(gpValue * 10 * 100) / 100; // 1 GP = 10 SP
        const cpValue = Math.round(gpValue * 100 * 100) / 100; // 1 GP = 100 CP
        
        // Обновляем отображение
        if (this.ppValue) this.ppValue.textContent = ppValue.toFixed(2);
        if (this.spValue) this.spValue.textContent = spValue.toFixed(0);
        if (this.cpValue) this.cpValue.textContent = cpValue.toFixed(0);
    }

    /**
     * Переключает сортировку по цене
     */
    togglePriceSort() {
        if (!this.filters.sortByPrice) {
            // Включаем сортировку по возрастанию
            this.filters.sortByPrice = true;
            this.filters.sortDirection = 'asc';
        } else if (this.filters.sortDirection === 'asc') {
            // Переключаем на убывание
            this.filters.sortDirection = 'desc';
        } else {
            // Выключаем сортировку
            this.filters.sortByPrice = false;
        }
        
        // Обновляем текст кнопки
        if (this.sortByPrice) {
            if (!this.filters.sortByPrice) {
                this.sortByPrice.textContent = '💰 Сортировать по цене';
            } else if (this.filters.sortDirection === 'asc') {
                this.sortByPrice.textContent = '💰 Цена: ↑ (дешевые)';
            } else {
                this.sortByPrice.textContent = '💰 Цена: ↓ (дорогие)';
            }
        }
    }

    /**
     * Применяет фильтры к результатам поиска
     * @param {Array} results - Результаты поиска
     * @returns {Array} Отфильтрованные результаты
     */
    applyFilters(results) {
        let filteredResults = results.filter(item => {
            // Фильтр по уровню
            const itemLevel = item.system?.level?.value;
            if (itemLevel !== null && itemLevel !== undefined) {
                // Показываем предметы от 0 до maxLevel включительно
                if (itemLevel > this.filters.maxLevel) {
                    return false;
                }
            }

            // Фильтр по цене
            const priceValue = item.system?.price?.value;
            if (priceValue) {
                const itemPriceInGP = this.convertPriceToGP(priceValue);
                if (itemPriceInGP > this.filters.maxPrice) {
                    return false;
                }
            }

            return true;
        });

        // Сортировка по цене, если включена
        if (this.filters.sortByPrice) {
            filteredResults = this.sortResultsByPrice(filteredResults);
        }

        return filteredResults;
    }

    /**
     * Сортирует результаты по цене
     * @param {Array} results - Результаты для сортировки
     * @returns {Array} Отсортированные результаты
     */
    sortResultsByPrice(results) {
        return results.sort((itemA, itemB) => {
            const priceA = this.convertPriceToGP(itemA.system?.price?.value || {});
            const priceB = this.convertPriceToGP(itemB.system?.price?.value || {});
            
            if (this.filters.sortDirection === 'asc') {
                return priceA - priceB; // От дешевых к дорогим
            } else {
                return priceB - priceA; // От дорогих к дешевым
            }
        });
    }

    /**
     * Конвертирует цену предмета в GP (золотые монеты)
     * @param {Object} priceValue - Объект с ценой предмета
     * @returns {number} Цена в GP
     */
    convertPriceToGP(priceValue) {
        let totalGP = 0;
        
        // Конвертируем все валюты в GP
        if (priceValue.pp) totalGP += priceValue.pp * 10;     // 1 PP = 10 GP
        if (priceValue.gp) totalGP += priceValue.gp;        // 1 GP = 1 GP
        if (priceValue.sp) totalGP += priceValue.sp * 0.1;   // 1 SP = 0.1 GP
        if (priceValue.cp) totalGP += priceValue.cp * 0.01;  // 1 CP = 0.01 GP
        
        return totalGP;
    }

    /**
     * Очищает все фильтры
     */
    clearAllFilters() {
        this.filters.maxLevel = 20;
        this.filters.maxPrice = 100; // 100 GP
        this.filters.sortByPrice = false;
        this.filters.sortDirection = 'asc';
        
        // Сбрасываем input максимального уровня
        if (this.maxLevelInput) {
            this.maxLevelInput.value = '20';
        }
        
        // Сбрасываем input максимальной цены
        if (this.maxPriceInput) {
            this.maxPriceInput.value = '100';
        }
        
        // Сбрасываем кнопку сортировки
        if (this.sortByPrice) {
            this.sortByPrice.textContent = '💰 Сортировать по цене';
        }
        
        // Обновляем конвертер
        this.updatePriceConverter();
        
        // Перезапускаем поиск
        this.performSearch();
    }

    /**
     * Очищает поиск и возвращает к начальному состоянию
     */
    clearSearch() {
        this.input.value = '';
        this.clearAllFilters();
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


