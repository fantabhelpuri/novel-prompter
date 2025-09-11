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

}

function initializeBlankProject() {
    entries = [];
    story = new Story();
    systemPrompt = new SystemPrompt();
    projectTitle = "Untitled Project";
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
    
    // Update entry fields
    currentEditingEntry.title = document.getElementById('dialog-type-input').value;
    currentEditingEntry.type = document.getElementById('dialog-type-input').value;
    currentEditingEntry.global = document.getElementById('dialog-global').checked;
    currentEditingEntry.description = document.getElementById('dialog-description').value;
    
    // Update details
    const detailItems = document.querySelectorAll('.detail-item');
    currentEditingEntry.details = [];
    detailItems.forEach(item => {
        const titleInput = item.querySelector('.detail-title');
        const valueInput = item.querySelector('.detail-value');
        if (titleInput && valueInput && titleInput.value.trim() && valueInput.value.trim()) {
            currentEditingEntry.addDetail(titleInput.value, valueInput.value);
        }
    });
    
    // Re-render entries and close dialog
    renderEntries();
    closeEntryDialog();
    markAsChanged(); // Add this line
}

function renderDetailsInDialog() {
    const detailsContainer = document.getElementById('details-container');
    detailsContainer.innerHTML = '';
    
    if (currentEditingEntry.details.length === 0) {
        currentEditingEntry.addDetail("", "");
    }
    
    currentEditingEntry.details.forEach((detail, index) => {
        addDetailField(detail.title, detail.value);
    });
}

function addDetailField(title = '', value = '') {
    const detailsContainer = document.getElementById('details-container');
    
    const detailItem = document.createElement('div');
    detailItem.className = 'detail-item';
    detailItem.innerHTML = `
        <input type="text" class="detail-title" placeholder="Detail title" value="${title}">
        <input type="text" class="detail-value" placeholder="Detail value" value="${value}">
        <button type="button" class="detail-remove">Remove</button>
    `;
    
    // Add remove functionality
    detailItem.querySelector('.detail-remove').addEventListener('click', function() {
        detailItem.remove();
    });
    
    detailsContainer.appendChild(detailItem);
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
            generatePromptBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                generatePromptForScene(chapterIndex, sceneIndex);
            });
            
            summaryHeader.appendChild(summaryLabel);
            summaryHeader.appendChild(generatePromptBtn);
            
            const summaryTextarea = document.createElement('textarea');
            summaryTextarea.className = 'scene-textarea';
            summaryTextarea.placeholder = 'Enter scene summary...';
            summaryTextarea.value = scene.summary;
            summaryTextarea.addEventListener('change', function() {
                updateScene(chapterIndex, sceneIndex, this.value, null);
            });
            
            summarySection.appendChild(summaryHeader);
            summarySection.appendChild(summaryTextarea);
            
            // Text section (75% width)
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
        addSceneButton.addEventListener('click', function() {
            addNewScene(chapterIndex);
        });
        scenesContainer.appendChild(addSceneButton);

        chapterDiv.appendChild(scenesContainer);
        chaptersContainer.appendChild(chapterDiv);
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
        version: "1.0",
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
        }
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
        version: "1.0",
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
        }
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
    
    // Load project title
    projectTitle = projectData.title || "Untitled Project";
    document.getElementById('project-title').value = projectTitle;
    
    // Load entries (existing code remains the same)
    if (projectData.entries && Array.isArray(projectData.entries)) {
        projectData.entries.forEach(entryData => {
            const entry = new Entry(
                entryData.title || "",
                entryData.type || "",
                entryData.global || false,
                entryData.description || ""
            );
            
            // Load details
            if (entryData.details && Array.isArray(entryData.details)) {
                entryData.details.forEach(detailData => {
                    entry.addDetail(detailData.title || "", detailData.value || "");
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
    document.getElementById('character-select').value = systemPrompt.character;
    
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
    
    // For now, we'll show an alert with the scene info
    // This is where you'll later implement the actual prompt generation logic
    const sceneInfo = `Chapter: ${chapterIndex + 1}, Scene: ${sceneIndex + 1}
    Summary: ${scene.summary || 'No summary provided'}
    Text: ${scene.text || 'No text provided'}`;
    
    console.log('Generating prompt for:', sceneInfo);
    
    // Placeholder functionality - you can replace this with your prompt generation logic
    alert(`Generate Prompt clicked for Chapter ${chapterIndex + 1}, Scene ${sceneIndex + 1}    
        This is where you'll implement the prompt generation logic that uses:
        - System Prompt settings
        - Scene summary and text
        - Character and story context
        - All the entries (Characters, Locations, etc.)`);
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
        story: { chapters: story.chapters },
        systemPrompt: {
            systemPrompt: systemPrompt.systemPrompt,
            styleGuide: systemPrompt.styleGuide,
            storyGenre: systemPrompt.storyGenre,
            tense: systemPrompt.tense,
            language: systemPrompt.language,
            pointOfView: systemPrompt.pointOfView,
            character: systemPrompt.character
        }
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
