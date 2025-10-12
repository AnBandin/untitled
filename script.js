// Импортируем данные предметов из отдельного файла
import items from './items.js';

// Функция для подсветки совпадений в тексте
function highlightMatches(text, query, className = 'highlight') {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, `<span class="${className}">$1</span>`);
}

// Привязываем обработчик к кнопке и инпуту
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('userInput');
    const button = document.getElementById('searchButton');

    // Основная функция поиска с использованием findItems
    const processInput = function() {
        const query = input.value.trim();
        const resultDiv = document.getElementById('result');
        
        if (!query) {
            resultDiv.innerHTML = '<div class="empty-state">Введите текст для поиска предметов...</div>';
            return;
        }
        
        const results = findItems(query);
        
        if (results.length === 0) {
            resultDiv.innerHTML = `
                <div class="no-results">
                    <strong>Предметы не найдены</strong><br>
                    По запросу "${query}" ничего не найдено. Попробуйте изменить поисковый запрос.
                </div>
            `;
            return;
        }
        
        let html = `<div class="search-results-header">Найдено предметов: ${results.length}</div>`;
        
        results.forEach(item => {
            // Очищаем HTML теги из описания для лучшей читаемости
            const cleanDescription = (item?.description ?? '')
                .replace(/<[^>]*>/g, '') // Убираем HTML теги
                .replace(/@UUID\[[^\]]*\]/g, '') // Убираем UUID ссылки
                .replace(/@Trait\[[^\]]*\]/g, '') // Убираем trait ссылки
                .trim();
            
            // Подсвечиваем совпадения в названии и описании
            const highlightedName = highlightMatches(item.name, query, 'highlight-name');
            const highlightedDescription = highlightMatches(cleanDescription, query, 'highlight-description');
            
            // Создаем ссылку на Archives of Nethys с подсветкой внутри
            const aonUrl = `https://2e.aonprd.com/Search.aspx?q=${encodeURIComponent(item.key)}`;
            const highlightedKey = highlightMatches(item.key, query, 'highlight');
            const clickableId = `<a href="${aonUrl}" target="_blank" title="Открыть в Archives of Nethys">${highlightedKey}</a>`;
            
            html += `
                <div class="item-block">
                    <div class="item-name">${highlightedName}</div>
                    <div class="item-id">ID: ${clickableId}</div>
                    <div class="item-description">${highlightedDescription}</div>
                </div>
            `;
        });
        
        resultDiv.innerHTML = html;
    };

    // Обработка Enter в инпуте
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            processInput();
        }
    });

    // Обработка клика по кнопке
    button.addEventListener('click', processInput);
});

function findItems(value) {
    if (!value) return [];
    const lowerValue = value.toLowerCase();
    const filtered = Object.entries(items).filter(([key, item]) => {
        const name = item.name || '';
        const description = item.description || '';
        const keyStr = key || '';
        return (
            name.toLowerCase().includes(lowerValue) ||
            description.toLowerCase().includes(lowerValue) ||
            keyStr.toLowerCase().includes(lowerValue)
        );
    }).map(([key, item]) => ({
        key,
        name: item.name,
        description: item.description
    }));

    return filtered;
}


