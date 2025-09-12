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

// Initialize with blank data (no sample data)
function initializeApp() {
    // Start with blank project
    initializeBlankProject();
    
    // Render the UI
    renderEntries();
    renderStory();
    
    // Add event listeners for the main buttons
    document.getElementById('add-entry-btn').addEventListener('click', addNewEntry);
    document.getElementById('add-chapter-btn').addEventListener('click', addNewChapter);
    
    // Add event listeners for dialog
    document.getElementById('dialog-save').addEventListener('click', saveEntryDialog);
    document.getElementById('dialog-cancel').addEventListener('click', closeEntryDialog);
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
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    // Add these event listeners in initializeApp function
    document.getElementById('detail-dialog-save').addEventListener('click', saveDetailDialog);
    document.getElementById('detail-dialog-cancel').addEventListener('click', closeDetailDialog);

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
    const entry = new Entry("New Entry", "Character", false, "Description...");
    entries.push(entry);
    renderEntries();
    markAsChanged(); // Add this line
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
    if (!currentEditingEntry) return;
    
    const newTitle = document.getElementById('dialog-title').value.trim();
    
    // Validate title uniqueness
    if (!validateEntryTitle(newTitle, currentEditingIndex)) {
        alert(`An entry with the title "${newTitle}" already exists. Please choose a different title.`);
        return;
    }
    
    // Update entry fields
    currentEditingEntry.title = newTitle;
    currentEditingEntry.type = document.getElementById('dialog-type-input').value;
    currentEditingEntry.global = document.getElementById('dialog-global').checked;
    currentEditingEntry.description = document.getElementById('dialog-description').value;
    
    // Re-render entries and close dialog
    renderEntries();
    closeEntryDialog();
    markAsChanged();
    
    // Update character dropdown if system prompt dialog is open
    updateCharacterDropdown();
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
                <strong>${detail.title}:</strong> ${detail.value}
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
    document.getElementById('text-field-container').style.display = 'block';
    document.getElementById('combobox-field-container').style.display = 'none';
}

function showComboboxField() {
    document.getElementById('text-field-container').style.display = 'none';
    document.getElementById('combobox-field-container').style.display = 'block';
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
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
        }
    });
}

function filterDetailOptionOptions(searchTerm) {
    const dropdown = document.getElementById('detail-option-dropdown');
    const options = dropdown.querySelectorAll('.combobox-option');
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
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
        chapterHeader.textContent = `Chapter ${chapterIndex + 1}`;
        chapterDiv.appendChild(chapterHeader);

        const scenesContainer = document.createElement('div');
        scenesContainer.className = 'scenes-container';

        chapter.scenes.forEach((scene, sceneIndex) => {
            const sceneDiv = document.createElement('div');
            sceneDiv.className = 'scene';

            const sceneHeader = document.createElement('div');
            sceneHeader.className = 'scene-header';
            sceneHeader.textContent = `Scene ${sceneIndex + 1}`;
            sceneDiv.appendChild(sceneHeader);

            const sceneContent = document.createElement('div');
            sceneContent.className = 'scene-content';

            // Summary section (25% width)
            const summarySection = document.createElement('div');
            summarySection.className = 'scene-section summary-section';

            const summaryHeader = document.createElement('div');
            summaryHeader.className = 'scene-section-header';

            const summaryLabel = document.createElement('span');
            summaryLabel.textContent = 'Summary';

            const generatePromptBtn = document.createElement('button');
            generatePromptBtn.className = 'generate-prompt-btn';
            generatePromptBtn.textContent = 'Prompt';
            generatePromptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                generatePromptForScene(chapterIndex, sceneIndex);
            });

            summaryHeader.appendChild(summaryLabel);
            summaryHeader.appendChild(generatePromptBtn);

            const summaryTextarea = document.createElement('textarea');
            summaryTextarea.className = 'scene-textarea';
            summaryTextarea.placeholder = 'Enter scene summary...';
            summaryTextarea.value = scene.summary;
            
            // Create a display div for showing links
            const summaryDisplay = document.createElement('div');
            summaryDisplay.className = 'scene-display';
            summaryDisplay.style.display = 'none';
            
            let isEditingMode = true;
            
            // Function to toggle between edit and display mode
            function toggleMode() {
                if (isEditingMode) {
                    // Switch to display mode
                    summaryTextarea.style.display = 'none';
                    summaryDisplay.style.display = 'block';
                    updateTextWithLiveLinks(summaryDisplay, summaryTextarea.value);
                    isEditingMode = false;
                } else {
                    // Switch to edit mode
                    summaryTextarea.style.display = 'block';
                    summaryDisplay.style.display = 'none';
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

            // Text section (75% width) - keeping original functionality
            const textSection = document.createElement('div');
            textSection.className = 'scene-section text-section';

            const textHeader = document.createElement('div');
            textHeader.className = 'scene-section-header';
            textHeader.textContent = 'Text';

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
        addSceneButton.className = 'add-button';
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
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
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
        option.addEventListener('click', function() {
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
        e.stopPropagation();
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            filterEntryTypeOptions('');
        }
    });
    
    // Filter options as user types
    freshInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterEntryTypeOptions(searchTerm);
        dropdown.classList.add('show');
    });
    
    // Show dropdown when input is focused
    freshInput.addEventListener('focus', function() {
        dropdown.classList.add('show');
        filterEntryTypeOptions(this.value.toLowerCase());
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
        } else {
            option.style.display = 'none';
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
    
    // 1. System Prompt text from Settings
    if (systemPrompt.systemPrompt && systemPrompt.systemPrompt.trim()) {
        promptParts.push(`<system_prompt>\n    ${systemPrompt.systemPrompt}\n</system_prompt>`);
    }
    
    // 2. Style Guide text from Settings
    if (systemPrompt.styleGuide && systemPrompt.styleGuide.trim()) {
        promptParts.push(`<style_guide>\n    ${systemPrompt.styleGuide}\n</style_guide>`);
    }
    
    // 3. Story Genre instruction
    if (systemPrompt.storyGenre && systemPrompt.storyGenre.trim()) {
        promptParts.push(`<genre>${systemPrompt.storyGenre}</genre>`);
    }
    
    // 4. Tense instruction
    if (systemPrompt.tense && systemPrompt.tense.trim()) {
        promptParts.push(`<tense>${systemPrompt.tense}</tense>`);
    }
    
    // 5. Language instruction
    if (systemPrompt.language && systemPrompt.language.trim()) {
        promptParts.push(`<language>${systemPrompt.language}</language>`);
    }
    
    // 6. Point of View instruction
    if (systemPrompt.pointOfView && systemPrompt.pointOfView.trim()) {
        promptParts.push(`<point_of_view>${systemPrompt.pointOfView}</point_of_view>`);
    }
    
    // 7. Character point of view instruction
    if (systemPrompt.character && systemPrompt.character.trim()) {
        promptParts.push(`<character_perspective>${systemPrompt.character}</character_perspective>`);
    }
    
    // 8. Collect all scene summaries up to the current scene
    const previousScenes = [];
    let allSceneSummaries = "";
    
    // Get all scenes from all chapters up to but not including the current scene
    for (let chapterIdx = 0; chapterIdx <= chapterIndex; chapterIdx++) {
        const currentChapter = story.getChapter(chapterIdx);
        if (!currentChapter) continue;
        
        // For chapters before the current one, include all scenes
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
    
    // Add current scene summary to the text to analyze
    if (scene.summary && scene.summary.trim()) {
        allSceneSummaries += scene.summary.trim() + "\n";
    }
    
    // 9. Extract highlighted entries from all scene summaries
    const highlightedEntries = extractHighlightedEntries(allSceneSummaries);
    
    // 10. Add highlighted entries information
    if (highlightedEntries.length > 0) {
        promptParts.push("<character_and_world_info>");
        
        highlightedEntries.forEach(entry => {
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
    
    // 11. Add previous scenes section if there are any
    if (previousScenes.length > 0) {
        promptParts.push("<previous_scenes>");
        
        previousScenes.forEach(sceneInfo => {
            promptParts.push(`    <scene chapter="${sceneInfo.chapterNumber}" number="${sceneInfo.sceneNumber}">`);
            promptParts.push(`        ${sceneInfo.summary}`);
            promptParts.push("    </scene>");
        });
        
        promptParts.push("</previous_scenes>");
    }
    
    // 12. Add the current scene summary as the writing prompt
    if (scene.summary && scene.summary.trim()) {
        promptParts.push("<scene_to_write>");
        promptParts.push(`    ${scene.summary}`);
        promptParts.push("</scene_to_write>");
    }
    
    // Join all parts with newlines
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
    if (currentEditingIndex !== -1) {
        entries.splice(currentEditingIndex, 1);
        renderEntries();
        closeEntryDialog();
        closeConfirmationDialog();
        markAsChanged(); // Add this line
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
            statusElement.style.backgroundColor = "#d4edda";
            statusElement.style.color = "#155724";
            statusElement.style.border = "1px solid #c3e6cb";
            break;
        case "error":
            statusElement.style.backgroundColor = "#f8d7da";
            statusElement.style.color = "#721c24";
            statusElement.style.border = "1px solid #f5c6cb";
            break;
        case "warning":
            statusElement.style.backgroundColor = "#fff3cd";
            statusElement.style.color = "#856404";
            statusElement.style.border = "1px solid #ffeaa7";
            break;
        default: // info
            statusElement.style.backgroundColor = "#d1ecf1";
            statusElement.style.color = "#0c5460";
            statusElement.style.border = "1px solid #bee5eb";
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

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', initializeApp);
