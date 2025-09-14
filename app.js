const path = window.require('path');

// Initialize application data
let entries = [];
let story = new Story();
let currentEditingEntry = null;
let currentEditingIndex = -1;
let projectTitle = "Untitled Project";
let systemPrompt = new SystemPrompt();
let hasUnsavedChanges = false;
let currentFilePath = null;
let lastSavedState = null;
let currentDetailIndex = -1; // -1 for new detail, >= 0 for editing existing
let detailTitleOptions = []; // Populated from existing details
let detailOptionValues = []; // Populated based on selected title
let detailRegistry = new DetailRegistry();
let currentConfirmCallback = null;
let isResizing = false;
let currentResizer = null;
let startX = 0;
let startWidth = 0;
// Global variable to store the current summary width percentage
let summaryWidthPercentage = loadSummaryWidthSetting(); // Load from application settings

// Load summary width setting from localStorage
function loadSummaryWidthSetting() {
    const savedWidth = localStorage.getItem('summaryWidthPercentage');
    return savedWidth ? parseFloat(savedWidth) : 35; // Default 35%
}

// Save summary width setting to localStorage
function saveSummaryWidthSetting(percentage) {
    localStorage.setItem('summaryWidthPercentage', percentage.toString());
}

function initializeResizers() {
    // Find all vertical resizers and add event listeners
    document.addEventListener('mousedown', handleResizerMouseDown);
    document.addEventListener('mousemove', handleResizerMouseMove);
    document.addEventListener('mouseup', handleResizerMouseUp);
}

function handleResizerMouseDown(e) {
    if (e.target.classList.contains('vertical-resizer')) {
        isResizing = true;
        currentResizer = e.target;
        startX = e.clientX;
        
        // Get the scene content container
        const sceneContent = currentResizer.closest('.scene-content');
        const summarySection = sceneContent.querySelector('.summary-section');
        startWidth = summarySection.offsetWidth;
        
        // Add resizing class for visual feedback
        document.body.classList.add('resizing');
        
        e.preventDefault();
    }
}

function handleResizerMouseMove(e) {
    if (!isResizing || !currentResizer) return;
    
    const deltaX = e.clientX - startX;
    const sceneContent = currentResizer.closest('.scene-content');
    const summarySection = sceneContent.querySelector('.summary-section');
    
    // Calculate new width
    const newWidth = startWidth + deltaX;
    const containerWidth = sceneContent.offsetWidth;
    const newPercentage = Math.max(10, Math.min(80, (newWidth / containerWidth) * 100));
    
    // Update the global percentage
    summaryWidthPercentage = newPercentage;

    // Save the setting to localStorage
    saveSummaryWidthSetting(newPercentage);

    // Apply to all scenes
    updateAllSceneDividers();
    
    e.preventDefault();
}

function handleResizerMouseUp(e) {
    if (isResizing) {
        isResizing = false;
        currentResizer = null;
        document.body.classList.remove('resizing');
    }
}

function updateAllSceneDividers() {
    // Update all summary sections to use the new percentage with direct styles
    const summarySections = document.querySelectorAll('.scene-section.summary-section');
    
    summarySections.forEach(section => {
        // Apply the width directly as inline styles
        section.style.flexBasis = `${summaryWidthPercentage}%`;
        section.style.minWidth = `${summaryWidthPercentage}%`;
        section.style.maxWidth = `${summaryWidthPercentage}%`;
    });
    
    // Also update the text sections to fill the remaining space
    const textSections = document.querySelectorAll('.scene-section.text-section');
    textSections.forEach(section => {
        section.style.flex = '1'; // Take up remaining space
    });
}

// Helper function to get the appropriate width class
function getSummaryWidthClass(percentage) {
    const roundedPercentage = Math.round(percentage / 5) * 5; // Round to nearest 5
    const clampedPercentage = Math.max(10, Math.min(80, roundedPercentage));
    return `summary-width-${clampedPercentage}`;
}

function createVerticalResizer() {
    const resizer = document.createElement('div');
    resizer.className = 'vertical-resizer';
    resizer.title = 'Drag to resize';
    return resizer;
}

// Initialize with blank data (no sample data)
function initializeApp() {
    // Start with blank project
    initializeBlankProject();
    
    // Render the UI
    renderEntries();
    renderStory();
    
    document.getElementById('new-project-btn').addEventListener('click', newProject);
    document.getElementById('save-btn').addEventListener('click', saveProject);

    // Add event listeners for the main buttons
    document.getElementById('add-entry-btn').addEventListener('click', addNewEntry);
    document.getElementById('add-chapter-btn').addEventListener('click', addNewChapter);
    
    // Add event listeners for dialog
    document.getElementById('dialog-save').addEventListener('click', saveEntryDialog);
    document.getElementById('dialog-cancel').addEventListener('click', closeEntryDialog);
    document.getElementById('dialog-close').addEventListener('click', closeEntryDialog);

    // Close system prompt dialog when clicking overlay
    document.getElementById('dialog-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEntryDialog();
        }
    });

    document.getElementById('add-detail-btn').addEventListener('click', addDetailField);
    
    // Add event listeners for save/load
    document.getElementById('save-btn').addEventListener('click', saveProject);
    document.getElementById('load-btn').addEventListener('click', loadProject);
    document.getElementById('load-file-input').addEventListener('change', handleFileLoad);
    
    // Add event listener for project title
    document.getElementById('project-title').addEventListener('input', function() {
        projectTitle = this.value || "Untitled Project";
    });
    
    // Close dialog when clicking overlay
    document.getElementById('dialog-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEntryDialog();
        }
    });

    document.getElementById('system-prompt-btn').addEventListener('click', openSystemPromptDialog);
    document.getElementById('system-prompt-save').addEventListener('click', saveSystemPromptDialog);
    document.getElementById('system-prompt-cancel').addEventListener('click', closeSystemPromptDialog);
    document.getElementById('system-prompt-close').addEventListener('click', closeSystemPromptDialog);

    // Close system prompt dialog when clicking overlay
    document.getElementById('system-prompt-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSystemPromptDialog();
        }
    });

    // Add these event listeners in initializeApp():
    document.getElementById('dialog-delete').addEventListener('click', deleteEntry);
    document.getElementById('confirmation-confirm').addEventListener('click', confirmDelete);
    document.getElementById('confirmation-cancel').addEventListener('click', closeConfirmationDialog);

    // Close confirmation dialog when clicking overlay
    document.getElementById('confirmation-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeConfirmationDialog();
        }
    });

    document.getElementById('save-as-btn').addEventListener('click', saveAsProject);

    // Update the project title listener:
    document.getElementById('project-title').addEventListener('input', function() {
        const newTitle = this.value.replace(' *', ''); // Remove asterisk if present
        if (newTitle !== projectTitle) {
            projectTitle = newTitle || "Untitled Project";
            markAsChanged();
        }
    });

    // Add beforeunload listener to warn about unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            // Show custom confirmation dialog instead of browser default
            e.preventDefault();
            showUnsavedChangesDialog();
            return false;
        }
    });
    
    // Add these event listeners in initializeApp function
    document.getElementById('detail-dialog-save').addEventListener('click', saveDetailDialog);
    document.getElementById('detail-dialog-cancel').addEventListener('click', closeDetailDialog);
    document.getElementById('detail-dialog-close').addEventListener('click', closeDetailDialog);
    
    // Radio button listeners
    document.getElementById('value-type-text').addEventListener('change', showTextField);
    document.getElementById('value-type-combobox').addEventListener('change', showComboboxField);

    // Close detail dialog when clicking overlay
    document.getElementById('detail-dialog-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeDetailDialog();
        }
    });

    document.getElementById('prompt-dialog-close').addEventListener('click', closePromptDialog);
    document.getElementById('prompt-copy-btn').addEventListener('click', copyPromptToClipboard);

    // Close dialog when clicking overlay
    document.getElementById('prompt-dialog-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closePromptDialog();
        }
    });

    // Export dialog event listeners
    document.getElementById('export-btn').addEventListener('click', exportStory);
    document.getElementById('export-dialog-close').addEventListener('click', closeExportDialog);
    document.getElementById('export-copy-btn').addEventListener('click', copyExportToClipboard);

    // Close export dialog when clicking overlay
    document.getElementById('export-dialog-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeExportDialog();
        }
    });

    document.getElementById('collapse-sidebar-btn').addEventListener('click', toggleSidebar);

    document.getElementById('options-btn').addEventListener('click', openOptionsDialog);
    document.getElementById('options-close').addEventListener('click', closeOptionsDialog);
    document.getElementById('theme-toggle').addEventListener('change', toggleTheme);

    // Close options dialog when clicking overlay
    document.getElementById('options-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeOptionsDialog();
        }
    });

    document.addEventListener('click', function(e) {
        const chapterBtn = e.target.closest('.delete-chapter-btn');
        if (chapterBtn) {
          const chapterIndex = parseInt(chapterBtn.dataset.chapterIndex, 10);
          if (!Number.isNaN(chapterIndex)) {
            deleteChapter(chapterIndex);
          }
          return;
        }
      
        const sceneBtn = e.target.closest('.delete-scene-btn');
        if (sceneBtn) {
          const chapterIndex = parseInt(sceneBtn.dataset.chapterIndex, 10);
          const sceneIndex = parseInt(sceneBtn.dataset.sceneIndex, 10);
          if (!Number.isNaN(chapterIndex) && !Number.isNaN(sceneIndex)) {
            deleteScene(chapterIndex, sceneIndex);
          }
          return;
        }
    });

    // Load saved application settings
    loadSavedTheme();

    // Apply saved summary width to initial layout
    updateAllSceneDividers();

    initializeResizers();
}

function openOptionsDialog() {
    document.getElementById('options-overlay').classList.add('show');
}

function closeOptionsDialog() {
    document.getElementById('options-overlay').classList.remove('show');
}

function toggleTheme() {
    const isDark = document.getElementById('theme-toggle').checked;
    document.body.className = isDark ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Load saved theme on startup
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDark = savedTheme === 'dark';
    document.body.className = isDark ? 'dark-theme' : 'light-theme';
    document.getElementById('theme-toggle').checked = isDark;
}

function newProject() {
    if (hasUnsavedChanges) {
        showGenericConfirmationDialog(
            "Unsaved Changes",
            "You have unsaved changes. Creating a new project will discard these changes. Are you sure you want to continue?",
            function() {
                // User confirmed - create new project
                initializeBlankProject();
                renderEntries();
                renderStory();
                closeGenericConfirmationDialog();
            }
        );
    } else {
        // No unsaved changes - create new project directly
        initializeBlankProject();
        renderEntries();
        renderStory();
    }
}

function showGenericConfirmationDialog(title, message, confirmCallback) {
    document.getElementById('confirmation-overlay').querySelector('.dialog-header').textContent = title;
    document.getElementById('confirmation-message').textContent = message;
    document.getElementById('confirmation-overlay').classList.add('show');
    
    // Store the callback for the confirm button
    currentConfirmCallback = confirmCallback;
}

function closeGenericConfirmationDialog() {
    document.getElementById('confirmation-overlay').classList.remove('show');
    currentConfirmCallback = null;
}

function initializeBlankProject() {
    entries = [];
    story = new Story();
    systemPrompt = new SystemPrompt();
    detailRegistry = new DetailRegistry(); // Reset detail registry
    projectTitle = 'Untitled Project';
    currentFilePath = null;
    hasUnsavedChanges = false;
    document.getElementById('project-title').value = projectTitle;
    updateTitle();
}

function addSampleEntries() {
    const entry1 = new Entry("Entry Title", "Entry Type", true, "Entry Description Text Field...");
    entry1.addDetail("Detail Title", "Detail Value");
    entries.push(entry1);

    const entry2 = new Entry("Entry Title", "Entry Type", false, "Entry Description Text Field...");
    entry2.addDetail("Detail Title", "Detail Value");
    entries.push(entry2);

    const entry3 = new Entry("Entry Title", "Entry Type", true, "Entry Description Text Field...");
    entry3.addDetail("Detail Title", "Detail Value");
    entries.push(entry3);
}

function addSampleStory() {
    // Add Chapter 1
    const chapter1Index = story.addChapter();
    story.addSceneToChapter(chapter1Index, "", "");
    story.addSceneToChapter(chapter1Index, "", "");
}

function addNewEntry() {
    // Create a temporary entry with default values
    const newEntry = new Entry("", "", false, "");
    
    // Open dialog for the new entry with index -1 (indicates new entry)
    openEntryDialogForNew(newEntry);
}

function openEntryDialogForNew(entry) {
    currentEditingEntry = entry;
    currentEditingIndex = -1; // -1 indicates this is a new entry, not editing existing
    
    // Populate dialog fields with default/empty values
    document.getElementById('dialog-title').value = entry.title;
    document.getElementById('dialog-type-input').value = ""; // Changed: Keep type field blank
    document.getElementById('dialog-global').checked = entry.global;
    document.getElementById('dialog-description').value = ""; // Changed: Keep description blank
    
    // Clear details since this is a new entry
    renderDetailsInDialog();
    
    // Show dialog
    document.getElementById('dialog-overlay').classList.add('show');

    // Populate entry type dropdown
    populateEntryTypeDropdown();

    // Setup entry type combobox functionality  
    setupEntryTypeCombobox();
    
    // Focus on the title field for immediate editing
    setTimeout(() => {
        document.getElementById('dialog-title').focus();
        document.getElementById('dialog-title').select();
    }, 100);
}

function addNewChapter() {
    const chapterIndex = story.addChapter();
    story.addSceneToChapter(chapterIndex, "", "");
    renderStory();
    markAsChanged(); // Add this line
}

function addNewScene(chapterIndex) {
    story.addSceneToChapter(chapterIndex, "", "");
    renderStory();
    markAsChanged(); // Add this line
}

function renderEntries() {
    const entriesList = document.getElementById('entries-list');
    entriesList.innerHTML = '';
    
    if (entries.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No entries yet. Click "Add Entry" to create one.';
        entriesList.appendChild(emptyState);
        return;
    }

    entries.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-item';
        entryDiv.draggable = true;
        entryDiv.dataset.index = index;
        
        entryDiv.innerHTML = `
            <div class="entry-title">
                <span>${entry.title}</span>
                <span>${entry.type}</span>
            </div>
            <div class="entry-description">${entry.description}</div>
        `;
        
        // Add click event listener to open dialog
        entryDiv.addEventListener('click', function() {
            openEntryDialog(entry, index);
        });
        
        // Add drag and drop event listeners
        entryDiv.addEventListener('dragstart', handleDragStart);
        entryDiv.addEventListener('dragover', handleDragOver);
        entryDiv.addEventListener('drop', handleDrop);
        entryDiv.addEventListener('dragend', handleDragEnd);
        
        entriesList.appendChild(entryDiv);
    });
}

function openEntryDialog(entry, index) {
    currentEditingEntry = entry;
    currentEditingIndex = index;
    
    // Populate dialog fields
    document.getElementById('dialog-title').value = entry.title;
    document.getElementById('dialog-type-input').value = entry.type;
    document.getElementById('dialog-global').checked = entry.global;
    document.getElementById('dialog-description').value = entry.description;
    
    // Populate details
    renderDetailsInDialog();
    
    // Show dialog
    document.getElementById('dialog-overlay').classList.add('show');

    // Populate entry type dropdown
    populateEntryTypeDropdown();

    // Setup entry type combobox functionality  
    setupEntryTypeCombobox();
}

function closeEntryDialog() {
    document.getElementById('dialog-overlay').classList.remove('show');
    currentEditingEntry = null;
    currentEditingIndex = -1;
}

function saveEntryDialog() {
    // Get all input elements
    const titleInput = document.getElementById('dialog-title');
    const typeInput = document.getElementById('dialog-type-input');
    const globalInput = document.getElementById('dialog-global');
    const descriptionInput = document.getElementById('dialog-description');
    
    // Always ensure inputs are enabled at the start of validation
    const allInputs = [titleInput, typeInput, globalInput, descriptionInput];
    allInputs.forEach(input => {
        if (input) input.disabled = false;
    });
    
    // Validate required fields
    const title = titleInput.value.trim();
    
    if (!title) {
        // Show error message without disabling inputs
        showStatusMessage('Title is required', 'error');
        titleInput.focus();
        titleInput.select();
        return; // Stop here, but keep inputs enabled
    }
    
    // If we get here, validation passed
    try {
        // Get other values
        const type = typeInput.value.trim();
        const isGlobal = globalInput.checked;
        const description = document.getElementById('dialog-description').value.trim();
        
        if (currentEditingIndex === -1) {
            // Creating new entry
            const newEntry = new Entry(title, type, isGlobal, description);
            
            // Add details if any exist
            const detailElements = document.querySelectorAll('.detail-display-item');
            detailElements.forEach(detailElement => {
                const detailTitle = detailElement.querySelector('.detail-info strong').textContent;
                const detailValue = detailElement.querySelector('.detail-value').textContent;
                newEntry.addDetail(detailTitle, detailValue);
            });
            
            // Add to entries array
            entries.push(newEntry);
            
            // Update detail registry
            newEntry.details.forEach(detail => {
                detailRegistry.addValueToDetailType(detail.title, detail.value);
            });
        } else {
            // Editing existing entry
            const entry = entries[currentEditingIndex];
            entry.title = title;
            entry.type = type;
            entry.global = isGlobal;
            entry.description = description;
            
            // Update details (you may need to implement this based on your detail handling)
            // entry.details = ... (handle detail updates)
        }
        
        // Mark as changed and update UI
        markAsChanged();
        renderEntries();
        closeEntryDialog();
        showStatusMessage('Entry saved successfully', 'success');
        
    } catch (error) {
        // Handle any save errors without disabling inputs
        console.error('Error saving entry:', error);
        showStatusMessage('Error saving entry: ' + error.message, 'error');
    }
}

function updateCharacterDropdown() {
    const characterSelect = document.getElementById('character-select');
    if (!characterSelect) return; // Dialog not open
    
    const currentValue = characterSelect.value;
    
    // Clear and repopulate
    characterSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a character...';
    characterSelect.appendChild(defaultOption);
    
    // Add character entries
    const characterEntries = entries.filter(entry => entry.type.toLowerCase() === 'character');
    characterEntries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.title;
        option.textContent = entry.title;
        characterSelect.appendChild(option);
    });
    
    // Try to restore previous selection if it still exists
    if (currentValue && characterEntries.some(entry => entry.title === currentValue)) {
        characterSelect.value = currentValue;
    } else if (systemPrompt.character && characterEntries.some(entry => entry.title === systemPrompt.character)) {
        characterSelect.value = systemPrompt.character;
    }
}

function renderDetailsInDialog() {
    const detailsContainer = document.getElementById('details-container');
    detailsContainer.innerHTML = '';
    
    if (currentEditingEntry.details.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No details added yet.';
        detailsContainer.appendChild(emptyState);
        return;
    }
    
    currentEditingEntry.details.forEach((detail, index) => {
        const detailItem = document.createElement('div');
        detailItem.className = 'detail-display-item';
        detailItem.innerHTML = `
            <div class="detail-info">
                <strong>${detail.title}</strong>
                <div class="detail-value">${detail.value}</div>
            </div>
            <div class="detail-actions">
                <button type="button" class="detail-edit">Edit</button>
                <button type="button" class="detail-remove">Remove</button>
            </div>
        `;
        
        // Add edit functionality
        detailItem.querySelector('.detail-edit').addEventListener('click', function() {
            openDetailDialog(index);
        });
        
        // Add remove functionality
        detailItem.querySelector('.detail-remove').addEventListener('click', function() {
            currentEditingEntry.removeDetail(index);
            renderDetailsInDialog();
            markAsChanged();
        });
        
        detailsContainer.appendChild(detailItem);
    });
}

// Modified addDetailField function - now opens dialog instead of creating fields
function addDetailField() {
    currentDetailIndex = -1; // New detail
    openDetailDialog();
}

// New function to open detail dialog
function openDetailDialog(detailIndex = -1) {
    currentDetailIndex = detailIndex;
    
    // Reset form
    document.getElementById('detail-title-input').value = '';
    document.getElementById('detail-text-input').value = '';
    document.getElementById('detail-option-input').value = '';
    document.getElementById('value-type-text').checked = true;
    showTextField();
    
    // If editing existing detail
    if (detailIndex >= 0 && currentEditingEntry.details[detailIndex]) {
        const detail = currentEditingEntry.details[detailIndex];
        document.getElementById('detail-title-input').value = detail.title;
        document.getElementById('detail-text-input').value = detail.value;
    }
    
    // Populate dropdowns
    populateDetailTitleDropdown();
    populateDetailOptionDropdown();
    
    // Setup combobox functionality
    setupDetailTitleCombobox();
    setupDetailOptionCombobox();
    
    // Show dialog
    document.getElementById('detail-dialog-overlay').classList.add('show');
}

// Function to close detail dialog
function closeDetailDialog() {
    document.getElementById('detail-dialog-overlay').classList.remove('show');
    currentDetailIndex = -1;
}

// Function to save detail from dialog
function saveDetailDialog() {
    const title = document.getElementById('detail-title-input').value.trim();
    const valueType = document.querySelector('input[name="value-type"]:checked').value;
    let value = '';
    
    if (valueType === 'text') {
        value = document.getElementById('detail-text-input').value.trim();
    } else {
        value = document.getElementById('detail-option-input').value.trim();
    }
    
    if (!title || !value) {
        alert('Please fill in both title and value fields.');
        return;
    }

    // Register the detail type and value in the registry
    detailRegistry.addDetailType(title, valueType);
    if (valueType === 'combobox') {
        detailRegistry.addValueToDetailType(title, value, valueType);
    }

    if (currentDetailIndex === -1) {
        // Add new detail
        currentEditingEntry.addDetail(title, value);
    } else {
        // Update existing detail
        currentEditingEntry.updateDetail(currentDetailIndex, title, value);
    }
    
    renderDetailsInDialog();
    closeDetailDialog();
    markAsChanged();
}

// Function to show/hide value input fields based on radio selection
function showTextField() {
    document.getElementById('text-field-container').classList.remove('hidden');
    document.getElementById('combobox-field-container').classList.add('hidden');
}

function showComboboxField() {
    document.getElementById('text-field-container').classList.add('hidden');
    document.getElementById('combobox-field-container').classList.remove('hidden');
}

// Function to populate detail title dropdown
function populateDetailTitleDropdown() {
    const dropdown = document.getElementById('detail-title-dropdown');
    dropdown.innerHTML = '';
    
    // Get titles from the detail registry
    const titles = detailRegistry.getDetailTitles();
    
    titles.forEach(title => {
        const option = document.createElement('div');
        option.className = 'combobox-option';
        option.textContent = title;
        option.addEventListener('click', function() {
            document.getElementById('detail-title-input').value = title;
            dropdown.classList.remove('show');
            
            // Auto-select value type based on detail type
            const detailType = detailRegistry.getDetailType(title);
            if (detailType) {
                if (detailType.valueType === 'combobox') {
                    document.getElementById('value-type-combobox').checked = true;
                    showComboboxField();
                } else {
                    document.getElementById('value-type-text').checked = true;
                    showTextField();
                }
            }
            
            populateDetailOptionDropdown(); // Update options based on selected title
        });
        dropdown.appendChild(option);
    });
}

// Function to populate detail option dropdown
function populateDetailOptionDropdown() {
    const dropdown = document.getElementById('detail-option-dropdown');
    dropdown.innerHTML = '';
    
    const selectedTitle = document.getElementById('detail-title-input').value.trim();
    if (!selectedTitle) return;
    
    // Get values from the detail registry
    const values = detailRegistry.getPossibleValues(selectedTitle);
    
    values.forEach(value => {
        const option = document.createElement('div');
        option.className = 'combobox-option';
        option.textContent = value;
        option.addEventListener('click', function() {
            document.getElementById('detail-option-input').value = value;
            dropdown.classList.remove('show');
        });
        dropdown.appendChild(option);
    });
}

// Setup combobox functionality for detail title
function setupDetailTitleCombobox() {
    const input = document.getElementById('detail-title-input');
    const dropdown = document.getElementById('detail-title-dropdown');
    const dropdownBtn = document.getElementById('detail-title-dropdown-btn');
    
    // Toggle dropdown when button is clicked
    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    // Filter options as user types
    input.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterDetailTitleOptions(searchTerm);
        dropdown.classList.add('show');
        populateDetailOptionDropdown(); // Update options when title changes
    });
    
    // Show dropdown when input is focused
    input.addEventListener('focus', function() {
        dropdown.classList.add('show');
        filterDetailTitleOptions(this.value.toLowerCase());
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdownBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// Setup combobox functionality for detail option
function setupDetailOptionCombobox() {
    const input = document.getElementById('detail-option-input');
    const dropdown = document.getElementById('detail-option-dropdown');
    const dropdownBtn = document.getElementById('detail-option-dropdown-btn');
    
    // Toggle dropdown when button is clicked
    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    // Filter options as user types
    input.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterDetailOptionOptions(searchTerm);
        dropdown.classList.add('show');
    });
    
    // Show dropdown when input is focused
    input.addEventListener('focus', function() {
        dropdown.classList.add('show');
        filterDetailOptionOptions(this.value.toLowerCase());
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdownBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// Filter functions for dropdowns
function filterDetailTitleOptions(searchTerm) {
    const dropdown = document.getElementById('detail-title-dropdown');
    const options = dropdown.querySelectorAll('.combobox-option');
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            option.classList.remove('hidden');
        } else {
            option.classList.add('hidden');
        }
    });
}

function filterDetailOptionOptions(searchTerm) {
    const dropdown = document.getElementById('detail-option-dropdown');
    const options = dropdown.querySelectorAll('.combobox-option');
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            option.classList.remove('hidden');
        } else {
            option.classList.add('hidden');
        }
    });
}

function renderStory() {
    const chaptersContainer = document.getElementById('chapters-container');
    chaptersContainer.innerHTML = '';

    if (story.chapters.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No chapters yet. Click "Add Chapter" to start your story.';
        chaptersContainer.appendChild(emptyState);
        return;
    }

    story.chapters.forEach((chapter, chapterIndex) => {
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter';

        const chapterHeader = document.createElement('div');
        chapterHeader.className = 'chapter-header';

        // Replace innerHTML with createElement
        const chapterTitle = document.createElement('span');
        chapterTitle.textContent = `Chapter ${chapterIndex + 1}`;

        const deleteChapterBtn = document.createElement('button');
        deleteChapterBtn.className = 'danger-btn delete-chapter-btn';
        deleteChapterBtn.title = 'Delete Chapter';
        deleteChapterBtn.dataset.chapterIndex = chapterIndex;

        const deleteChapterIcon = document.createElement('i');
        //deleteChapterIcon.className = 'icon';
        deleteChapterIcon.textContent = 'Delete Chapter';
        deleteChapterBtn.appendChild(deleteChapterIcon);

        chapterHeader.appendChild(chapterTitle);
        chapterHeader.appendChild(deleteChapterBtn);
        chapterDiv.appendChild(chapterHeader);

        const scenesContainer = document.createElement('div');
        scenesContainer.className = 'scenes-container';

        chapter.scenes.forEach((scene, sceneIndex) => {
            const sceneDiv = document.createElement('div');
            sceneDiv.className = 'scene';

            const sceneHeader = document.createElement('div');
            sceneHeader.className = 'scene-header';

            // Replace innerHTML with createElement
            const sceneTitle = document.createElement('span');
            sceneTitle.textContent = `Scene ${sceneIndex + 1}`;

            const deleteSceneBtn = document.createElement('button');
            deleteSceneBtn.className = 'danger-btn delete-scene-btn';
            deleteSceneBtn.title = 'Delete Scene';
            deleteSceneBtn.dataset.chapterIndex = chapterIndex;
            deleteSceneBtn.dataset.sceneIndex = sceneIndex;

            const deleteSceneIcon = document.createElement('i');
            //deleteSceneIcon.className = 'icon';
            deleteSceneIcon.textContent = 'Delete Scene';
            deleteSceneBtn.appendChild(deleteSceneIcon);

            sceneHeader.appendChild(sceneTitle);
            sceneHeader.appendChild(deleteSceneBtn);
            sceneDiv.appendChild(sceneHeader);

            const sceneContent = document.createElement('div');
            sceneContent.className = 'scene-content';

            // Summary section (adjustable width)
            const summarySection = document.createElement('div');
            summarySection.className = 'scene-section summary-section';
            summarySection.style.flexBasis = summaryWidthPercentage + '%';
            summarySection.style.minWidth = summaryWidthPercentage + '%';
            summarySection.style.maxWidth = summaryWidthPercentage + '%';

            const summaryHeader = document.createElement('div');
            summaryHeader.className = 'scene-section-header';

            const summaryLabel = document.createElement('span');
            summaryLabel.textContent = 'Summary';

            const ideaPromptBtn = document.createElement('button');
            ideaPromptBtn.className = 'generate-prompt-btn';
            ideaPromptBtn.textContent = 'Idea Prompt';
            ideaPromptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                generateIdeaPromptForScene(chapterIndex, sceneIndex);
            });

            summaryHeader.appendChild(summaryLabel);
            summaryHeader.appendChild(ideaPromptBtn);

            const summaryTextarea = document.createElement('textarea');
            summaryTextarea.className = 'scene-textarea';
            summaryTextarea.placeholder = 'Enter scene summary...';
            summaryTextarea.value = scene.summary;

            // Create a display div for showing links
            const summaryDisplay = document.createElement('div');
            summaryDisplay.className = 'scene-textarea';
            summaryDisplay.classList.add('hidden');

            let isEditingMode = true;

            // Function to toggle between edit and display mode
            function toggleMode() {
                if (isEditingMode) {
                    // Switch to display mode
                    summaryTextarea.classList.add('hidden');
                    summaryDisplay.classList.remove('hidden');
                    updateTextWithLiveLinks(summaryDisplay, summaryTextarea.value);
                    isEditingMode = false;
                } else {
                    // Switch to edit mode
                    summaryTextarea.classList.remove('hidden');
                    summaryDisplay.classList.add('hidden');
                    isEditingMode = true;
                    summaryTextarea.focus();
                }
            }

            // Event handlers for the textarea
            summaryTextarea.addEventListener('blur', () => {
                // Only switch to display mode if there's text
                if (summaryTextarea.value.trim()) {
                    setTimeout(() => {
                        // Check if we're not immediately refocusing
                        if (document.activeElement !== summaryTextarea) {
                            toggleMode();
                        }
                    }, 100);
                }
            });

            summaryTextarea.addEventListener('change', function() {
                updateScene(chapterIndex, sceneIndex, this.value, null);
            });

            // Event handler for display div
            summaryDisplay.addEventListener('click', () => {
                toggleMode();
            });

            // Initialize display if there's content
            if (scene.summary.trim()) {
                toggleMode();
            }

            summarySection.appendChild(summaryHeader);
            summarySection.appendChild(summaryTextarea);
            summarySection.appendChild(summaryDisplay);

            // Create and add vertical resizer
            const resizer = createVerticalResizer();
            summarySection.appendChild(resizer);

            // Text section (takes remaining space)
            const textSection = document.createElement('div');
            textSection.className = 'scene-section text-section';

            const textHeader = document.createElement('div');
            textHeader.className = 'scene-section-header';

            const textLabel = document.createElement('span');
            textLabel.textContent = 'Text';

            const generatePromptBtn = document.createElement('button');
            generatePromptBtn.className = 'generate-prompt-btn';
            generatePromptBtn.textContent = 'Generate Prompt';
            generatePromptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                generatePromptForScene(chapterIndex, sceneIndex);
            });

            textHeader.appendChild(textLabel);
            textHeader.appendChild(generatePromptBtn);

            const textTextarea = document.createElement('textarea');
            textTextarea.className = 'scene-textarea';
            textTextarea.placeholder = 'Enter scene text...';
            textTextarea.value = scene.text;
            textTextarea.addEventListener('change', function() {
                updateScene(chapterIndex, sceneIndex, null, this.value);
            });

            textSection.appendChild(textHeader);
            textSection.appendChild(textTextarea);

            sceneContent.appendChild(summarySection);
            sceneContent.appendChild(textSection);
            sceneDiv.appendChild(sceneContent);

            scenesContainer.appendChild(sceneDiv);
        });

        // Add scene button
        const addSceneButton = document.createElement('button');
        addSceneButton.className = 'add-button primary-btn';
        addSceneButton.textContent = 'Add Scene';
        addSceneButton.addEventListener('click', () => {
            addNewScene(chapterIndex);
        });

        scenesContainer.appendChild(addSceneButton);
        chapterDiv.appendChild(scenesContainer);
        chaptersContainer.appendChild(chapterDiv);
    });
}

// Function to process text and create links for matching entry titles
function processTextForLinks(text) {
    if (!text || entries.length === 0) {
        return text;
    }
    
    let processedText = text;
    
    // Create a map of entry titles for case-insensitive matching
    const entryTitles = new Map();
    entries.forEach((entry, index) => {
        entryTitles.set(entry.title.toLowerCase(), {
            originalTitle: entry.title,
            index: index
        });
    });
    
    // Sort titles by length (longest first) to avoid partial matches
    const sortedTitles = Array.from(entryTitles.keys()).sort((a, b) => b.length - a.length);
    
    sortedTitles.forEach(lowerTitle => {
        const entryInfo = entryTitles.get(lowerTitle);
        const originalTitle = entryInfo.originalTitle;
        const index = entryInfo.index;
        
        // Create a regex for case-insensitive whole word matching
        const regex = new RegExp(`\\b${originalTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        
        processedText = processedText.replace(regex, (match) => {
            return `<a href="#" class="entry-link" data-entry-index="${index}">${match}</a>`;
        });
    });
    
    return processedText;
}

// Function to handle clicks on entry links
function handleEntryLinkClick(event, entryIndex) {
    event.preventDefault();
    event.stopPropagation();
    
    // Find the corresponding entry in the sidebar
    const entryElement = document.querySelector(`[data-index="${entryIndex}"]`);
    if (entryElement) {
        // Scroll to the entry
        entryElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Add a highlight effect
        entryElement.classList.add('highlight-entry');
        setTimeout(() => {
            entryElement.classList.remove('highlight-entry');
        }, 2000);
    }
}

// Function to update text content with live linking
function updateTextWithLiveLinks(element, text) {
    const processedHTML = processTextForLinks(text);
    element.innerHTML = processedHTML;
    
    // Add click handlers to all entry links in this element
    const links = element.querySelectorAll('.entry-link');
    links.forEach(link => {
        link.addEventListener('click', (event) => {
            const entryIndex = parseInt(link.getAttribute('data-entry-index'));
            handleEntryLinkClick(event, entryIndex);
        });
    });
}

function updateScene(chapterIndex, sceneIndex, summary, text) {
    const chapter = story.getChapter(chapterIndex);
    const scene = chapter.getScene(sceneIndex);
    if (summary !== null) scene.summary = summary;
    if (text !== null) scene.text = text;
    markAsChanged(); // Add this line
}

// Save/Load Functions
function saveProject() {
    const projectData = {
        title: projectTitle,
        version: '1.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        entries: entries,
        story: {
            chapters: story.chapters
        },
        systemPrompt: {
            systemPrompt: systemPrompt.systemPrompt,
            styleGuide: systemPrompt.styleGuide,
            storyGenre: systemPrompt.storyGenre,
            tense: systemPrompt.tense,
            language: systemPrompt.language,
            pointOfView: systemPrompt.pointOfView,
            character: systemPrompt.character
        },
        detailRegistry: detailRegistry.toJSON() // Save detail registry
    };

    if (currentFilePath && isElectron()) {
        // Save to existing file (true overwrite in Electron) - NO DIALOG
        saveProjectToFile(currentFilePath, projectData);
    } else if (isElectron()) {
        // New file - open Save As dialog
        const filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        saveProjectAsDialog(projectData, filename);
    } else {
        // Browser fallback - download
        const filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        downloadProject(filename, projectData);
        markAsSaved();
    }
}

function saveAsProject() {
    const projectData = {
        title: projectTitle,
        version: '1.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        entries: entries,
        story: {
            chapters: story.chapters
        },
        systemPrompt: {
            systemPrompt: systemPrompt.systemPrompt,
            styleGuide: systemPrompt.styleGuide,
            storyGenre: systemPrompt.storyGenre,
            tense: systemPrompt.tense,
            language: systemPrompt.language,
            pointOfView: systemPrompt.pointOfView,
            character: systemPrompt.character
        },
        detailRegistry: detailRegistry.toJSON() // Save detail registry
    };
    
    const filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    
    if (isElectron()) {
        saveProjectAsDialog(projectData, filename);
    } else {
        // Browser fallback - download
        downloadProject(filename, projectData);
        currentFilePath = filename;
        markAsSaved();
    }
}

// Helper function to download project
function downloadProject(filename, projectData = null) {
    if (!projectData) {
        projectData = {
            title: projectTitle,
            version: "1.0",
            created: new Date().toISOString(),
            entries: entries,
            story: {
                chapters: story.chapters
            },
            systemPrompt: {
                systemPrompt: systemPrompt.systemPrompt,
                styleGuide: systemPrompt.styleGuide,
                storyGenre: systemPrompt.storyGenre,
                tense: systemPrompt.tense,
                language: systemPrompt.language,
                pointOfView: systemPrompt.pointOfView,
                character: systemPrompt.character
            }
        };
    }
    
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    markAsSaved();
}

function loadProject() {
    if (isElectron()) {
        loadProjectDialog();
    } else {
        // Browser fallback
        if (hasUnsavedChanges) {
            const confirmLoad = confirm('You have unsaved changes. Are you sure you want to load a new project? Your current changes will be lost.');
            if (!confirmLoad) {
                return;
            }
        }
        document.getElementById('load-file-input').click();
    }
}

// Helper function to extract filename from path
function getBasename(filePath) {
    if (isElectron()) {
        try {
            const path = window.require('path');
            return path.basename(filePath);
        } catch (error) {
            // Fallback if path module fails
            return filePath.split(/[\\/]/).pop();
        }
    } else {
        return filePath.split(/[\\/]/).pop();
    }
}

// Update the title to show current filename when applicable
function updateTitle() {
    const titleElement = document.getElementById('project-title');
    let displayTitle = projectTitle || 'Untitled Project';
    
    if (hasUnsavedChanges) {
        displayTitle += ' *';
    }
    
    titleElement.value = displayTitle;
    
    // Update window title in Electron
    if (isElectron() && currentFilePath) {
        const filename = getBasename(currentFilePath);
        document.title = `${displayTitle} - ${filename} - Novel Prompter`;
    } else {
        document.title = `${displayTitle} - Novel Prompter`;
    }
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            loadProjectData(projectData);
        } catch (error) {
            alert('Error loading project file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function loadProjectData(projectData) {
    // Clear current data
    entries = [];
    story = new Story();
    systemPrompt = new SystemPrompt();
    detailRegistry = new DetailRegistry(); // Reset detail registry

    // Load project title
    projectTitle = projectData.title || 'Untitled Project';
    document.getElementById('project-title').value = projectTitle;

    // Load detail registry
    if (projectData.detailRegistry) {
        detailRegistry.fromJSON(projectData.detailRegistry);
    }

    // Load entries (existing code remains the same)
    if (projectData.entries && Array.isArray(projectData.entries)) {
        projectData.entries.forEach(entryData => {
            const entry = new Entry(
                entryData.title || '',
                entryData.type || '',
                entryData.global || false,
                entryData.description || ''
            );

            // Load details
            if (entryData.details && Array.isArray(entryData.details)) {
                entryData.details.forEach(detailData => {
                    entry.addDetail(detailData.title || '', detailData.value || '');
                    
                    // Register the detail in the registry if not already present
                    if (!detailRegistry.hasDetailType(detailData.title)) {
                        detailRegistry.addDetailType(detailData.title, 'text');
                    }
                    detailRegistry.addValueToDetailType(detailData.title, detailData.value, 'text');
                });
            }

            entries.push(entry);
        });
    }
    
    // Load story (existing code remains the same)
    if (projectData.story && projectData.story.chapters && Array.isArray(projectData.story.chapters)) {
        projectData.story.chapters.forEach(chapterData => {
            const chapterIndex = story.addChapter();
            const chapter = story.getChapter(chapterIndex);
            
            // Clear the default scene
            chapter.scenes = [];
            
            // Load scenes
            if (chapterData.scenes && Array.isArray(chapterData.scenes)) {
                chapterData.scenes.forEach(sceneData => {
                    chapter.addScene(sceneData.text || "", sceneData.summary || "");
                });
            }
        });
    }
    
    // Load system prompt data
    if (projectData.systemPrompt) {
        systemPrompt.update(
            projectData.systemPrompt.systemPrompt || "",
            projectData.systemPrompt.styleGuide || "",
            projectData.systemPrompt.storyGenre || "Fantasy",
            projectData.systemPrompt.tense || "Past",
            projectData.systemPrompt.language || "English (US)",
            projectData.systemPrompt.pointOfView || "3rd Person",
            projectData.systemPrompt.character || ""
        );
    }
    
    // Keep currentFilePath as set by the loading function
    // In Electron, this will be the actual file path
    // In browser mode, this will remain null (which is correct)
    if (!isElectron()) {
        currentFilePath = null; // Only reset in browser mode
    }
    
    // Re-render everything
    renderEntries();
    renderStory();
    
    // Mark as saved since we just loaded
    markAsSaved();
    
    // Clear file input
    document.getElementById('load-file-input').value = '';
}

function populateDetailRegistryFromExistingEntries() {
    entries.forEach(entry => {
        entry.details.forEach(detail => {
            if (!detailRegistry.hasDetailType(detail.title)) {
                detailRegistry.addDetailType(detail.title, 'text');
            }
            detailRegistry.addValueToDetailType(detail.title, detail.value, 'text');
        });
    });
}

// System Prompt Dialog Functions
function openSystemPromptDialog() {
    // Populate fields with current values
    document.getElementById('system-prompt-text').value = systemPrompt.systemPrompt;
    document.getElementById('style-guide-text').value = systemPrompt.styleGuide;
    document.getElementById('story-genre-input').value = systemPrompt.storyGenre;
    
    // Populate genre dropdown
    populateGenreDropdown();
    
    // Populate new dropdowns
    populateSystemPromptDropdowns();
    
    // Set current values for new dropdowns
    document.getElementById('tense-select').value = systemPrompt.tense;
    document.getElementById('language-select').value = systemPrompt.language;
    document.getElementById('point-of-view-select').value = systemPrompt.pointOfView;
    
    // Update character dropdown with current entries
    updateCharacterDropdown();
    
    // Setup combobox functionality
    setupGenreCombobox();
    
    // Show dialog
    document.getElementById('system-prompt-overlay').classList.add('show');
}

function closeSystemPromptDialog() {
    document.getElementById('system-prompt-overlay').classList.remove('show');
    // Hide dropdown when closing dialog
    document.getElementById('genre-dropdown').classList.remove('show');
}

function validateEntryTitle(newTitle, currentIndex = -1) {
    // Check if title already exists (excluding current entry if editing)
    for (let i = 0; i < entries.length; i++) {
        if (i !== currentIndex && entries[i].title.toLowerCase() === newTitle.toLowerCase()) {
            return false;
        }
    }
    return true;
}

function saveSystemPromptDialog() {
    // Update system prompt object
    systemPrompt.update(
        document.getElementById('system-prompt-text').value,
        document.getElementById('style-guide-text').value,
        document.getElementById('story-genre-input').value,
        document.getElementById('tense-select').value,
        document.getElementById('language-select').value,
        document.getElementById('point-of-view-select').value,
        document.getElementById('character-select').value
    );
    
    closeSystemPromptDialog();
    markAsChanged(); // Add this line
}

function populateGenreDropdown() {
    const dropdown = document.getElementById('genre-dropdown');
    dropdown.innerHTML = '';
    
    SystemPrompt.getGenres().forEach(genre => {
        const option = document.createElement('div');
        option.className = 'combobox-option';
        option.textContent = genre;
        option.addEventListener('click', function() {
            document.getElementById('story-genre-input').value = genre;
            dropdown.classList.remove('show');
        });
        dropdown.appendChild(option);
    });
}

function setupGenreCombobox() {
    const input = document.getElementById('story-genre-input');
    const dropdown = document.getElementById('genre-dropdown');
    const dropdownBtn = document.getElementById('genre-dropdown-btn');
    
    // Remove existing event listeners to avoid duplicates
    const newInput = input.cloneNode(true);
    const newDropdownBtn = dropdownBtn.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    dropdownBtn.parentNode.replaceChild(newDropdownBtn, dropdownBtn);
    
    // Get fresh references
    const freshInput = document.getElementById('story-genre-input');
    const freshDropdownBtn = document.getElementById('genre-dropdown-btn');
    
    // Toggle dropdown when button is clicked
    freshDropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            filterGenreOptions('');
        }
    });
    
    // Filter options as user types
    freshInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterGenreOptions(searchTerm);
        dropdown.classList.add('show');
    });
    
    // Show dropdown when input is focused
    freshInput.addEventListener('focus', function() {
        dropdown.classList.add('show');
        filterGenreOptions(this.value.toLowerCase());
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!freshInput.contains(e.target) && !freshDropdownBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Handle keyboard navigation
    freshInput.addEventListener('keydown', function(e) {
        const options = dropdown.querySelectorAll('.combobox-option:not([style*="display: none"])');
        let highlighted = dropdown.querySelector('.combobox-option.highlighted');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!dropdown.classList.contains('show')) {
                dropdown.classList.add('show');
                filterGenreOptions(this.value.toLowerCase());
                return;
            }
            
            if (!highlighted) {
                if (options.length > 0) options[0].classList.add('highlighted');
            } else {
                highlighted.classList.remove('highlighted');
                const nextIndex = Array.from(options).indexOf(highlighted) + 1;
                if (nextIndex < options.length) {
                    options[nextIndex].classList.add('highlighted');
                } else {
                    options[0].classList.add('highlighted');
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!highlighted && options.length > 0) {
                options[options.length - 1].classList.add('highlighted');
            } else if (highlighted) {
                highlighted.classList.remove('highlighted');
                const prevIndex = Array.from(options).indexOf(highlighted) - 1;
                if (prevIndex >= 0) {
                    options[prevIndex].classList.add('highlighted');
                } else {
                    options[options.length - 1].classList.add('highlighted');
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlighted) {
                this.value = highlighted.textContent;
                dropdown.classList.remove('show');
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
        }
    });
}

function filterGenreOptions(searchTerm) {
    const dropdown = document.getElementById('genre-dropdown');
    const options = dropdown.querySelectorAll('.combobox-option');
    
    // Clear previous highlighting
    options.forEach(option => option.classList.remove('highlighted'));
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            option.classList.remove('hidden');
        } else {
            option.classList.add('hidden');
        }
    });
}

function populateEntryTypeDropdown() {
    const dropdown = document.getElementById('type-dropdown');
    dropdown.innerHTML = '';
    
    Entry.getEntryTypes().forEach(type => {
        const option = document.createElement('div');
        option.className = 'combobox-option';
        option.textContent = type;
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('dialog-type-input').value = type;
            dropdown.classList.remove('show');
        });
        dropdown.appendChild(option);
    });
}

function setupEntryTypeCombobox() {
    const input = document.getElementById('dialog-type-input');
    const dropdown = document.getElementById('type-dropdown');
    const dropdownBtn = document.getElementById('type-dropdown-btn');
    const container = document.querySelector('.combobox-container');
    
    // Remove existing event listeners to avoid duplicates
    const newInput = input.cloneNode(true);
    const newDropdownBtn = dropdownBtn.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    dropdownBtn.parentNode.replaceChild(newDropdownBtn, dropdownBtn);
    
    // Get fresh references
    const freshInput = document.getElementById('dialog-type-input');
    const freshDropdownBtn = document.getElementById('type-dropdown-btn');
    
    // Toggle dropdown when button is clicked
    freshDropdownBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            filterEntryTypeOptions('');
            freshInput.focus();
        }
    });
    
    // Filter options as user types
    freshInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterEntryTypeOptions(searchTerm);
        if (!dropdown.classList.contains('show')) {
            dropdown.classList.add('show');
        }
    });
    
    // Show dropdown when input is focused
    freshInput.addEventListener('focus', function() {
        dropdown.classList.add('show');
        filterEntryTypeOptions(this.value.toLowerCase());
    });
    
    // Prevent dropdown from closing when clicking inside it
    dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Hide dropdown when clicking outside - use a more reliable method
    document.addEventListener('click', function(e) {
        // Check if the click is outside the entire combobox container
        if (!container.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Handle keyboard navigation
    freshInput.addEventListener('keydown', function(e) {
        const options = dropdown.querySelectorAll('.combobox-option:not(.hidden)');
        let highlighted = dropdown.querySelector('.combobox-option.highlighted');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!dropdown.classList.contains('show')) {
                dropdown.classList.add('show');
                filterEntryTypeOptions(this.value.toLowerCase());
                return;
            }
            
            if (!highlighted) {
                if (options.length > 0) options[0].classList.add('highlighted');
            } else {
                highlighted.classList.remove('highlighted');
                const nextIndex = Array.from(options).indexOf(highlighted) + 1;
                if (nextIndex < options.length) {
                    options[nextIndex].classList.add('highlighted');
                } else {
                    options[0].classList.add('highlighted');
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!highlighted && options.length > 0) {
                options[options.length - 1].classList.add('highlighted');
            } else if (highlighted) {
                highlighted.classList.remove('highlighted');
                const prevIndex = Array.from(options).indexOf(highlighted) - 1;
                if (prevIndex >= 0) {
                    options[prevIndex].classList.add('highlighted');
                } else {
                    options[options.length - 1].classList.add('highlighted');
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlighted) {
                this.value = highlighted.textContent;
                dropdown.classList.remove('show');
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
        }
    });
}

function filterEntryTypeOptions(searchTerm) {
    const dropdown = document.getElementById('type-dropdown');
    const options = dropdown.querySelectorAll('.combobox-option');
    
    // Clear previous highlighting
    options.forEach(option => option.classList.remove('highlighted'));
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            option.style.display = 'block';
            option.classList.remove('hidden');
        } else {
            option.style.display = 'none';
            option.classList.add('hidden');
        }
    });
}

function populateSystemPromptDropdowns() {
    // Populate Tense dropdown
    const tenseSelect = document.getElementById('tense-select');
    tenseSelect.innerHTML = '';
    SystemPrompt.getTenses().forEach(tense => {
        const option = document.createElement('option');
        option.value = tense;
        option.textContent = tense;
        tenseSelect.appendChild(option);
    });

    // Populate Language dropdown
    const languageSelect = document.getElementById('language-select');
    languageSelect.innerHTML = '';
    SystemPrompt.getLanguages().forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languageSelect.appendChild(option);
    });

    // Populate Point of View dropdown
    const povSelect = document.getElementById('point-of-view-select');
    povSelect.innerHTML = '';
    SystemPrompt.getPointsOfView().forEach(pov => {
        const option = document.createElement('option');
        option.value = pov;
        option.textContent = pov;
        povSelect.appendChild(option);
    });

    // Populate Character dropdown
    const characterSelect = document.getElementById('character-select');
    characterSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a character...';
    characterSelect.appendChild(defaultOption);
    
    // Add character entries
    const characterEntries = entries.filter(entry => 
        entry.type.toLowerCase() === 'character'
    );
    
    characterEntries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.title;
        option.textContent = entry.title;
        characterSelect.appendChild(option);
    });
}

function generatePromptForScene(chapterIndex, sceneIndex) {
    const chapter = story.getChapter(chapterIndex);
    const scene = chapter.getScene(sceneIndex);
    
    // Generate the actual prompt content
    const promptText = generateFullPrompt(chapterIndex, sceneIndex);
    
    // Show the prompt in the dialog
    showPromptDialog(promptText);
}

function generateFullPrompt(chapterIndex, sceneIndex) {
    // Get the scene information
    const chapter = story.getChapter(chapterIndex);
    const scene = chapter.getScene(sceneIndex);
    
    let promptParts = [];
    
    // 1-7. All existing prompt parts (system prompt, style guide, etc.)
    if (systemPrompt.systemPrompt && systemPrompt.systemPrompt.trim()) {
        promptParts.push(`<system_prompt>\n    ${systemPrompt.systemPrompt}\n</system_prompt>`);
    }
    
    if (systemPrompt.styleGuide && systemPrompt.styleGuide.trim()) {
        promptParts.push(`<style_guide>\n    ${systemPrompt.styleGuide}\n</style_guide>`);
    }
    
    if (systemPrompt.storyGenre && systemPrompt.storyGenre.trim()) {
        promptParts.push(`<genre>${systemPrompt.storyGenre}</genre>`);
    }
    
    if (systemPrompt.tense && systemPrompt.tense.trim()) {
        promptParts.push(`<tense>${systemPrompt.tense}</tense>`);
    }
    
    if (systemPrompt.language && systemPrompt.language.trim()) {
        promptParts.push(`<language>${systemPrompt.language}</language>`);
    }
    
    if (systemPrompt.pointOfView && systemPrompt.pointOfView.trim()) {
        promptParts.push(`<point_of_view>${systemPrompt.pointOfView}</point_of_view>`);
    }
    
    if (systemPrompt.character && systemPrompt.character.trim()) {
        promptParts.push(`<character_perspective>${systemPrompt.character}</character_perspective>`);
    }
    
    // 8. Collect scene summaries and extract highlighted entries
    const previousScenes = [];
    let allSceneSummaries = "";
    
    for (let chapterIdx = 0; chapterIdx <= chapterIndex; chapterIdx++) {
        const currentChapter = story.getChapter(chapterIdx);
        if (!currentChapter) continue;
        
        const maxSceneIdx = (chapterIdx < chapterIndex) ? currentChapter.scenes.length : sceneIndex;
        
        for (let sceneIdx = 0; sceneIdx < maxSceneIdx; sceneIdx++) {
            const prevScene = currentChapter.getScene(sceneIdx);
            if (prevScene && prevScene.summary && prevScene.summary.trim()) {
                previousScenes.push({
                    chapterNumber: chapterIdx + 1,
                    sceneNumber: sceneIdx + 1,
                    summary: prevScene.summary.trim()
                });
                allSceneSummaries += prevScene.summary.trim() + "\n";
            }
        }
    }
    
    if (scene.summary && scene.summary.trim()) {
        allSceneSummaries += scene.summary.trim() + "\n";
    }
    
    // 9. Get highlighted entries and merge with global entries
    const highlightedEntries = extractHighlightedEntries(allSceneSummaries);
    const globalEntries = entries.filter(entry => entry.global);
    const allRelevantEntries = new Map();
    
    // Add highlighted entries first
    highlightedEntries.forEach(entry => {
        allRelevantEntries.set(entry.title, entry);
    });
    
    // Add global entries (ensures global entries are always included)
    globalEntries.forEach(entry => {
        allRelevantEntries.set(entry.title, entry);
    });
    
    const finalEntries = Array.from(allRelevantEntries.values());
    
    // 10. Add character and world information with proper XML formatting
    if (finalEntries.length > 0) {
        promptParts.push("<character_and_world_info>");
        
        finalEntries.forEach(entry => {
            promptParts.push(`    <entry type="${entry.type}">`);
            promptParts.push(`        <title>${entry.title}</title>`);
            if (entry.description && entry.description.trim()) {
                promptParts.push(`        <description>\n            ${entry.description}\n        </description>`);
            }
            if (entry.details && entry.details.length > 0) {
                promptParts.push("        <details>");
                entry.details.forEach(detail => {
                    const tagName = detail.title.toLowerCase().replace(/\s+/g, '_');
                    promptParts.push(`            <${tagName}>${detail.value}</${tagName}>`);
                });
                promptParts.push("        </details>");
            }
            promptParts.push("    </entry>");
        });
        
        promptParts.push("</character_and_world_info>");
    }
    
    // 11-12. Previous scenes and current scene (same as before)
    if (previousScenes.length > 0) {
        promptParts.push("<previous_scenes>");
        previousScenes.forEach(sceneInfo => {
            promptParts.push(`    <scene chapter="${sceneInfo.chapterNumber}" number="${sceneInfo.sceneNumber}">`);
            promptParts.push(`        ${sceneInfo.summary}`);
            promptParts.push("    </scene>");
        });
        promptParts.push("</previous_scenes>");
    }
    
    if (scene.summary && scene.summary.trim()) {
        promptParts.push("<scene_to_write>");
        promptParts.push(`    ${scene.summary}`);
        promptParts.push("</scene_to_write>");
    }
    
    return promptParts.join("\n");
}

// Helper function to extract highlighted entries from text
function extractHighlightedEntries(text) {
    if (!text || entries.length === 0) return [];
    
    const foundEntries = new Set(); // Use Set to avoid duplicates
    const highlightedEntries = [];
    
    // Create a map of entry titles for case-insensitive matching
    const entryTitles = new Map();
    entries.forEach((entry, index) => {
        entryTitles.set(entry.title.toLowerCase(), { originalTitle: entry.title, index: index });
    });
    
    // Sort titles by length (longest first) to avoid partial matches
    const sortedTitles = Array.from(entryTitles.keys()).sort((a, b) => b.length - a.length);
    
    sortedTitles.forEach(lowerTitle => {
        const entryInfo = entryTitles.get(lowerTitle);
        const originalTitle = entryInfo.originalTitle;
        const index = entryInfo.index;
        
        // Create a regex for case-insensitive whole word matching
        const regex = new RegExp(`\\b${originalTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        
        if (regex.test(text) && !foundEntries.has(index)) {
            foundEntries.add(index);
            highlightedEntries.push(entries[index]);
        }
    });
    
    return highlightedEntries;
}



function showPromptDialog(promptText) {
    document.getElementById('prompt-text-display').value = promptText;
    document.getElementById('prompt-dialog-overlay').classList.add('show');
}

function closePromptDialog() {
    document.getElementById('prompt-dialog-overlay').classList.remove('show');
}

async function copyPromptToClipboard() {
    const promptText = document.getElementById('prompt-text-display').value;
    
    try {
        await navigator.clipboard.writeText(promptText);
        
        // Visual feedback
        const copyBtn = document.getElementById('prompt-copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copy-success');
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copy-success');
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard');
    }
}

// Drag and Drop Functions
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const targetIndex = parseInt(this.dataset.index);
    if (targetIndex !== draggedIndex) {
        this.classList.add('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(this.dataset.index);
    
    if (draggedIndex !== null && targetIndex !== draggedIndex) {
        // Reorder entries array
        const draggedEntry = entries.splice(draggedIndex, 1)[0];
        entries.splice(targetIndex, 0, draggedEntry);
        renderEntries();
    }
    
    // Clear drag states
    document.querySelectorAll('.entry-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.entry-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedIndex = null;
}

// Delete Functionality
function deleteEntry() {
    if (currentEditingEntry && currentEditingIndex !== -1) {
        const confirmationMessage = `Are you sure you want to delete "${currentEditingEntry.title}"?`;
        document.getElementById('confirmation-message').textContent = confirmationMessage;
        document.getElementById('confirmation-overlay').classList.add('show');
    }
}

function confirmDelete() {
    if (currentConfirmCallback) {
        currentConfirmCallback();
    } else {
        // Fallback to original delete behavior if no callback
        if (currentEditingIndex >= 0) {
            entries.splice(currentEditingIndex, 1);
            renderEntries();
            closeEntryDialog();
            markAsChanged();
        }
        closeGenericConfirmationDialog();
    }
}

function closeConfirmationDialog() {
    document.getElementById('confirmation-overlay').classList.remove('show');
}

function markAsChanged() {
    hasUnsavedChanges = true;
    updateTitle();
}

function markAsSaved() {
    hasUnsavedChanges = false;
    lastSavedState = getCurrentProjectState();
    updateTitle();
}

function updateTitle() {
    const titleElement = document.getElementById('project-title');
    const baseTitle = projectTitle || 'Untitled Project';
    titleElement.value = hasUnsavedChanges ? `${baseTitle} *` : baseTitle;
}

function getCurrentProjectState() {
    return JSON.stringify({
        title: projectTitle,
        entries: entries,
        story: {
            chapters: story.chapters
        },
        systemPrompt: {
            systemPrompt: systemPrompt.systemPrompt,
            styleGuide: systemPrompt.styleGuide,
            storyGenre: systemPrompt.storyGenre,
            tense: systemPrompt.tense,
            language: systemPrompt.language,
            pointOfView: systemPrompt.pointOfView,
            character: systemPrompt.character
        },
        detailRegistry: detailRegistry.toJSON()
    });
}

// Status message system
function showStatusMessage(message, type = "info", duration = 2000) {
    // Create or get existing status element
    let statusElement = document.getElementById('status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'status-message';
        statusElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(statusElement);
    }
    
    // Set message and style based on type
    statusElement.textContent = message;
    statusElement.className = `status-${type}`;
    
    // Apply styles based on type
    switch(type) {
        case "success":
            statusElement.classList.add('status-success');
            break;
        case "error":
            statusElement.classList.add('status-error');
            break;
        case "warning":
            statusElement.classList.add('status-warning');
            break;
        default: // info
            statusElement.classList.add('status-info');
    }
    
    // Show and auto-hide
    statusElement.style.opacity = "1";
    statusElement.style.transform = "translateX(0)";
    
    // Clear any existing timeout
    if (statusElement.hideTimeout) {
        clearTimeout(statusElement.hideTimeout);
    }
    
    statusElement.hideTimeout = setTimeout(() => {
        statusElement.style.opacity = "0";
        statusElement.style.transform = "translateX(100%)";
        setTimeout(() => {
            if (statusElement.parentNode) {
                statusElement.parentNode.removeChild(statusElement);
            }
        }, 300);
    }, duration);
}

// Check if we're running in Electron
function isElectron() {
    return typeof window !== 'undefined' && window.process && window.process.type;
}

// Electron-specific file operations
async function saveProjectToFile(filePath, projectData) {
    if (!isElectron()) {
        showStatusMessage("File system access not available in browser mode", "error");
        return false;
    }

    try {
        const content = JSON.stringify(projectData, null, 2);
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('save-file', filePath, content);
        
        if (result.success) {
            currentFilePath = result.filePath;
            markAsSaved();
            showStatusMessage("Project saved successfully!", "success");
            return true;
        } else {
            showStatusMessage("Failed to save: " + result.error, "error");
            return false;
        }
    } catch (error) {
        showStatusMessage("Save error: " + error.message, "error");
        return false;
    }
}

async function saveProjectAsDialog(projectData, defaultName) {
    if (!isElectron()) {
        // Fallback to download for browser mode
        downloadProject(defaultName, projectData);
        return true;
    }

    try {
        const content = JSON.stringify(projectData, null, 2);
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('save-file-as', content, defaultName);
        
        if (result.success) {
            currentFilePath = result.filePath;
            markAsSaved();
            showStatusMessage("Project saved as: " + getBasename(result.filePath), "success");
            return true;
        } else if (result.error !== 'Save cancelled') {
            showStatusMessage("Failed to save: " + result.error, "error");
        }
        return false;
    } catch (error) {
        showStatusMessage("Save error: " + error.message, "error");
        return false;
    }
}

async function loadProjectDialog() {
    if (hasUnsavedChanges) {
        const confirmLoad = confirm('You have unsaved changes. Are you sure you want to load a new project? Your current changes will be lost.');
        if (!confirmLoad) {
            return;
        }
    }

    if (!isElectron()) {
        // Fallback to file input for browser mode
        document.getElementById('load-file-input').click();
        return;
    }

    try {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('load-file');
        
        if (result.success) {
            const projectData = JSON.parse(result.content);
            currentFilePath = result.filePath;
            loadProjectData(projectData);
            showStatusMessage("Project loaded: " + getBasename(result.filePath), "success");
        } else if (result.error !== 'Load cancelled') {
            showStatusMessage("Failed to load: " + result.error, "error");
        }
    } catch (error) {
        showStatusMessage("Load error: " + error.message, "error");
    }
}

function exportStory() {
    openExportDialog();
}

function openExportDialog() {
    const exportText = generateStoryText();
    document.getElementById('export-text').value = exportText;
    document.getElementById('export-dialog-overlay').classList.add('show');
}

function closeExportDialog() {
    document.getElementById('export-dialog-overlay').classList.remove('show');
}

function generateStoryText() {
    if (story.chapters.length === 0) {
        return "No story content available.";
    }
    
    let storyText = "";
    
    story.chapters.forEach((chapter, chapterIndex) => {
        // Add chapter heading
        storyText += `Chapter ${chapterIndex + 1}\n\n`;
        
        // Add scenes for this chapter
        chapter.scenes.forEach((scene, sceneIndex) => {
            if (scene.text && scene.text.trim()) {
                storyText += scene.text.trim();
                // Add single line break after each scene (except the last scene of the chapter)
                if (sceneIndex < chapter.scenes.length - 1) {
                    storyText += "\n\n";
                }
            }
        });
        
        // Add double line break after each chapter (except the last chapter)
        if (chapterIndex < story.chapters.length - 1) {
            storyText += "\n\n\n\n";
        }
    });
    
    return storyText;
}

function copyExportToClipboard() {
    const exportText = document.getElementById('export-text');
    exportText.select();
    exportText.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        
        // Visual feedback
        const copyBtn = document.getElementById('export-copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copy-success');
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copy-success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. Please select and copy manually.');
    }
}

function toggleSidebar() {
    const entriesPanel = document.getElementById('entries-panel');
    const collapseBtn = document.getElementById('collapse-sidebar-btn');
    
    entriesPanel.classList.toggle('collapsed');
    
    // Update button text based on state
    if (entriesPanel.classList.contains('collapsed')) {
        collapseBtn.textContent = '→';
        collapseBtn.title = 'Expand Sidebar';
    } else {
        collapseBtn.textContent = '←';
        collapseBtn.title = 'Collapse Sidebar';
    }
}

// Add this new function for the Idea Prompt functionality
function generateIdeaPromptForScene(chapterIndex, sceneIndex) {
    const chapter = story.getChapter(chapterIndex);
    const scene = chapter.getScene(sceneIndex);
    
    // Generate the idea brainstorming prompt
    const ideaPromptText = generateIdeaBrainstormingPrompt(chapterIndex, sceneIndex);
    
    // Show the prompt in the dialog
    showPromptDialog(ideaPromptText);
}

function generateIdeaBrainstormingPrompt(chapterIndex, sceneIndex) {
    // Get the scene information
    const chapter = story.getChapter(chapterIndex);
    const scene = chapter.getScene(sceneIndex);
    
    let promptParts = [];
    
    // 1. Basic story context
    if (systemPrompt.storyGenre && systemPrompt.storyGenre.trim()) {
        promptParts.push(`<genre>${systemPrompt.storyGenre}</genre>`);
    }
    
    if (systemPrompt.pointOfView && systemPrompt.pointOfView.trim()) {
        promptParts.push(`<point_of_view>${systemPrompt.pointOfView}</point_of_view>`);
    }
    
    if (systemPrompt.character && systemPrompt.character.trim()) {
        promptParts.push(`<main_character>${systemPrompt.character}</main_character>`);
    }
    
    // 8. Collect scene summaries and extract highlighted entries
    const previousScenes = []
    let allSceneSummaries = "";
    
    for (let chapterIdx = 0; chapterIdx <= chapterIndex; chapterIdx++) {
        const currentChapter = story.getChapter(chapterIdx);
        if (!currentChapter) continue;
        
        const maxSceneIdx = (chapterIdx < chapterIndex) ? currentChapter.scenes.length : sceneIndex;
        
        for (let sceneIdx = 0; sceneIdx < maxSceneIdx; sceneIdx++) {
            const prevScene = currentChapter.getScene(sceneIdx);
            if (prevScene && prevScene.summary && prevScene.summary.trim()) {
                previousScenes.push({
                    chapterNumber: chapterIdx + 1,
                    sceneNumber: sceneIdx + 1,
                    summary: prevScene.summary.trim()
                });
                allSceneSummaries += prevScene.summary.trim() + "\n";
            }
        }
    }
    
    if (scene.summary && scene.summary.trim()) {
        allSceneSummaries += scene.summary.trim() + "\n";
    }
    
    // Get highlighted entries and merge with global entries
    const highlightedEntries = extractHighlightedEntries(allSceneSummaries);
    const globalEntries = entries.filter(entry => entry.global);
    const allRelevantEntries = new Map();
    
    // Add highlighted entries first
    highlightedEntries.forEach(entry => {
        allRelevantEntries.set(entry.title, entry);
    });
    
    // Add global entries (ensures global entries are always included)
    globalEntries.forEach(entry => {
        allRelevantEntries.set(entry.title, entry);
    });
    
    const finalEntries = Array.from(allRelevantEntries.values());
    
    // 10. Add character and world information with proper XML formatting
    if (finalEntries.length > 0) {
        promptParts.push("<character_and_world_info>");
        
        finalEntries.forEach(entry => {
            promptParts.push(`    <entry type="${entry.type}">`);
            promptParts.push(`        <title>${entry.title}</title>`);
            if (entry.description && entry.description.trim()) {
                promptParts.push(`        <description>\n            ${entry.description}\n        </description>`);
            }
            if (entry.details && entry.details.length > 0) {
                promptParts.push("        <details>");
                entry.details.forEach(detail => {
                    const tagName = detail.title.toLowerCase().replace(/\s+/g, '_');
                    promptParts.push(`            <${tagName}>${detail.value}</${tagName}>`);
                });
                promptParts.push("        </details>");
            }
            promptParts.push("    </entry>");
        });
        
        promptParts.push("</character_and_world_info>");
    }
        
    if (previousScenes.length > 0) {
        promptParts.push("<previous_scenes>");
        previousScenes.forEach(sceneInfo => {
            promptParts.push(`    <scene chapter="${sceneInfo.chapterNumber}" number="${sceneInfo.sceneNumber}">`);
            promptParts.push(`        ${sceneInfo.summary}`);
            promptParts.push("    </scene>");
        });
        promptParts.push("</previous_scenes>");
    }
    
    // 4. Current scene if it has content
    if (scene.summary && scene.summary.trim()) {
        promptParts.push("<current_scene_draft>");
        promptParts.push(`    ${scene.summary}`);
        promptParts.push("</current_scene_draft>");
    }
    
    // 5. The brainstorming request
    promptParts.push("<brainstorming_request>");
    promptParts.push("    You are a creative writing assistant helping to brainstorm ideas for the next scene in this story.");
    promptParts.push("    Based on the story context and previous scenes, please suggest:");
    promptParts.push("    ");
    promptParts.push("    1. **Scene Ideas**: 3-5 different directions this scene could take");
    promptParts.push("    2. **Conflict Options**: Potential tensions, obstacles, or complications");
    promptParts.push("    3. **Character Moments**: Opportunities for character development or revelation");
    promptParts.push("    4. **Plot Advancement**: How this scene could move the story forward");
    promptParts.push("    5. **Emotional Beats**: What emotions or atmosphere this scene could explore");
    promptParts.push("    ");
    promptParts.push("    Please provide creative, specific suggestions that fit the genre and tone.");
    promptParts.push("    Focus on actionable ideas that could be developed into a full scene.");
    promptParts.push("</brainstorming_request>");
    
    return promptParts.join("\n");
}

function deleteChapter(chapterIndex) {
    if (chapterIndex < 0 || chapterIndex >= story.chapters.length) {
        showStatusMessage('Invalid chapter index', 'error');
        return;
    }
    
    const chapter = story.chapters[chapterIndex];
    const sceneCount = chapter.scenes.length;
    const chapterNumber = chapterIndex + 1;
    
    let message = `Are you sure you want to delete Chapter ${chapterNumber}?`;
    if (sceneCount > 0) {
        message += ` This will also delete ${sceneCount} scene${sceneCount > 1 ? 's' : ''}.`;
    }
    
    showGenericConfirmationDialog(
        "Delete Chapter",
        message,
        function() {
            const removedChapter = story.removeChapter(chapterIndex);
            if (removedChapter) {
                renderStory();
                markAsChanged();
                showStatusMessage(`Chapter ${chapterNumber} deleted successfully`, 'success');
            } else {
                showStatusMessage('Failed to delete chapter', 'error');
            }
            closeGenericConfirmationDialog();
        }
    );
}

function deleteScene(chapterIndex, sceneIndex) {
    if (chapterIndex < 0 || chapterIndex >= story.chapters.length) {
        showStatusMessage('Invalid chapter index', 'error');
        return;
    }
    
    const chapter = story.chapters[chapterIndex];
    if (sceneIndex < 0 || sceneIndex >= chapter.scenes.length) {
        showStatusMessage('Invalid scene index', 'error');
        return;
    }
    
    const chapterNumber = chapterIndex + 1;
    const sceneNumber = sceneIndex + 1;
    
    showGenericConfirmationDialog(
        "Delete Scene",
        `Are you sure you want to delete Scene ${sceneNumber} from Chapter ${chapterNumber}?`,
        function() {
            const removedScene = chapter.removeScene(sceneIndex);
            if (removedScene) {
                renderStory();
                markAsChanged();
                showStatusMessage(`Scene ${sceneNumber} deleted successfully`, 'success');
            } else {
                showStatusMessage('Failed to delete scene', 'error');
            }
            closeGenericConfirmationDialog();
        }
    );
}

function showUnsavedChangesDialog() {
    showGenericConfirmationDialog(
        "Unsaved Changes",
        "You have unsaved changes that will be lost if you close the application. Are you sure you want to close anyway?",
        function() {
            // User confirmed - close anyway
            hasUnsavedChanges = false; // Prevent the dialog from showing again
            closeGenericConfirmationDialog();
            
            // Close the app immediately
            if (isElectron()) {
                // Use the modern Electron API via IPC
                if (window.electronAPI && window.electronAPI.closeWindow) {
                    window.electronAPI.closeWindow();
                } else {
                    // Fallback: try to use window.close() or force close
                    try {
                        window.close();
                    } catch (e) {
                        // If window.close() fails, try to force quit
                        if (window.electronAPI && window.electronAPI.quit) {
                            window.electronAPI.quit();
                        }
                    }
                }
            } else {
                // In browser, close the tab/window
                window.close();
            }
        }
    );
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', initializeApp);
