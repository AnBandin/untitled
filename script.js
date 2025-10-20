// Импортируем данные предметов из отдельного файла
import items from './items.js';

/**
 * Упрощенный поисковик предметов PF2E
 * Основной класс приложения - объединяет поиск и UI
 */
class PF2ESearchApp {
    constructor() {
        this.items = items;
        this.cache = new Map(); // Простое кэширование результатов
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


