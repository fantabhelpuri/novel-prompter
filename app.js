// Initialize application data
let entries = [];
let story = new Story();

// Initialize with sample data
function initializeApp() {
    // Add some sample entries
    addSampleEntries();
    
    // Add sample chapters and scenes
    addSampleStory();
    
    // Render the UI
    renderEntries();
    renderStory();
    
    // Add event listeners for the main buttons
    document.getElementById('add-entry-btn').addEventListener('click', addNewEntry);
    document.getElementById('add-chapter-btn').addEventListener('click', addNewChapter);
}

function addSampleEntries() {
    const entry1 = new Entry("Entry Title", "Entry Type", "global", "Entry Description Text Field...");
    entry1.setDetail("Detail Title", "Detail Value");
    entries.push(entry1);

    const entry2 = new Entry("Entry Title", "Entry Type", "global", "Entry Description Text Field...");
    entry2.setDetail("Detail Title", "Detail Value");
    entries.push(entry2);

    const entry3 = new Entry("Entry Title", "Entry Type", "global", "Entry Description Text Field...");
    entry3.setDetail("Detail Title", "Detail Value");
    entries.push(entry3);
}

function addSampleStory() {
    // Add Chapter 1
    const chapter1Index = story.addChapter();
    story.addSceneToChapter(chapter1Index, "", "");
    story.addSceneToChapter(chapter1Index, "", "");
}

function addNewEntry() {
    const entry = new Entry("New Entry", "Type", "global", "Description...");
    entries.push(entry);
    renderEntries();
}

function addNewChapter() {
    const chapterIndex = story.addChapter();
    story.addSceneToChapter(chapterIndex, "", "");
    renderStory();
}

function addNewScene(chapterIndex) {
    story.addSceneToChapter(chapterIndex, "", "");
    renderStory();
}

function renderEntries() {
    const entriesList = document.getElementById('entries-list');
    entriesList.innerHTML = '';

    entries.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-item';
        entryDiv.innerHTML = `
            <div class="entry-title">
                <span>${entry.title}</span>
                <span>${entry.type}</span>
            </div>
            <div class="entry-description">${entry.description}</div>
        `;
        entriesList.appendChild(entryDiv);
    });
}

function renderStory() {
    const chaptersContainer = document.getElementById('chapters-container');
    chaptersContainer.innerHTML = '';

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

            // Summary section
            const summarySection = document.createElement('div');
            summarySection.className = 'scene-section';
            
            const summaryHeader = document.createElement('div');
            summaryHeader.className = 'scene-section-header';
            summaryHeader.textContent = 'Summary';
            
            const summaryTextarea = document.createElement('textarea');
            summaryTextarea.className = 'scene-textarea';
            summaryTextarea.placeholder = 'Enter scene summary...';
            summaryTextarea.value = scene.summary;
            summaryTextarea.addEventListener('change', function() {
                updateScene(chapterIndex, sceneIndex, this.value, null);
            });
            
            summarySection.appendChild(summaryHeader);
            summarySection.appendChild(summaryTextarea);

            // Text section
            const textSection = document.createElement('div');
            textSection.className = 'scene-section';
            
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
    
    if (summary !== null) {
        scene.summary = summary;
    }
    if (text !== null) {
        scene.text = text;
    }
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', initializeApp);
