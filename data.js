/**
 * Detail class - contains title and value fields
 */
class Detail {
    constructor(title = '', value = '') {
        this.title = title;  // text
        this.value = value;  // text
    }

    // Method to update detail
    update(title, value) {
        this.title = title;
        this.value = value;
    }

    // Method to get formatted detail string
    getFormattedDetail() {
        return `${this.title}: ${this.value}`;
    }
}

/**
 * Entry class - main entry with title, type, global, description, and detail fields
 */
class Entry {
    constructor(title = '', type = '', global = '', description = '', detail = null) {
        this.title = title;           // text
        this.type = type;             // text
        this.global = global;         // text
        this.description = description; // text
        this.detail = detail || new Detail(); // Detail object
    }

    // Method to set detail
    setDetail(title, value) {
        if (this.detail instanceof Detail) {
            this.detail.update(title, value);
        } else {
            this.detail = new Detail(title, value);
        }
    }

    // Method to get entry summary
    getSummary() {
        return {
            title: this.title,
            type: this.type,
            global: this.global,
            description: this.description,
            detail: this.detail.getFormattedDetail()
        };
    }
}

/**
 * Scene class - contains text and summary fields
 */
class Scene {
    constructor(text = '', summary = '') {
        this.text = text;       // text
        this.summary = summary; // text
    }

    // Method to update scene content
    update(text, summary) {
        this.text = text;
        this.summary = summary;
    }

    // Method to get word count of text
    getWordCount() {
        return this.text.split(/\s+/).filter(word => word.length > 0).length;
    }
}

/**
 * Chapter class - contains a numbered list of Scene objects
 */
class Chapter {
    constructor() {
        this.scenes = []; // numbered list (array) of Scene objects
    }

    // Method to add a scene
    addScene(text = '', summary = '') {
        const scene = new Scene(text, summary);
        this.scenes.push(scene);
        return this.scenes.length - 1; // return index of added scene
    }

    // Method to get a scene by index
    getScene(index) {
        if (index >= 0 && index < this.scenes.length) {
            return this.scenes[index];
        }
        return null;
    }

    // Method to update a scene at specific index
    updateScene(index, text, summary) {
        const scene = this.getScene(index);
        if (scene) {
            scene.update(text, summary);
            return true;
        }
        return false;
    }

    // Method to remove a scene
    removeScene(index) {
        if (index >= 0 && index < this.scenes.length) {
            return this.scenes.splice(index, 1)[0];
        }
        return null;
    }

    // Method to get total number of scenes
    getSceneCount() {
        return this.scenes.length;
    }

    // Method to get chapter summary
    getChapterSummary() {
        return this.scenes.map(scene => scene.summary).join(' ');
    }
}

/**
 * Story class - contains a numbered list of Chapter objects
 */
class Story {
    constructor() {
        this.chapters = []; // numbered list (array) of Chapter objects
    }

    // Method to add a chapter
    addChapter() {
        const chapter = new Chapter();
        this.chapters.push(chapter);
        return this.chapters.length - 1; // return index of added chapter
    }

    // Method to get a chapter by index
    getChapter(index) {
        if (index >= 0 && index < this.chapters.length) {
            return this.chapters[index];
        }
        return null;
    }

    // Method to remove a chapter
    removeChapter(index) {
        if (index >= 0 && index < this.chapters.length) {
            return this.chapters.splice(index, 1)[0];
        }
        return null;
    }

    // Method to get total number of chapters
    getChapterCount() {
        return this.chapters.length;
    }

    // Method to add a scene to a specific chapter
    addSceneToChapter(chapterIndex, text = '', summary = '') {
        const chapter = this.getChapter(chapterIndex);
        if (chapter) {
            return chapter.addScene(text, summary);
        }
        return -1;
    }

    // Method to get story statistics
    getStoryStats() {
        let totalScenes = 0;
        let totalWords = 0;

        this.chapters.forEach(chapter => {
            totalScenes += chapter.getSceneCount();
            chapter.scenes.forEach(scene => {
                totalWords += scene.getWordCount();
            });
        });

        return {
            chapters: this.chapters.length,
            scenes: totalScenes,
            words: totalWords
        };
    }

    // Method to get full story outline
    getStoryOutline() {
        return this.chapters.map((chapter, chapterIndex) => ({
            chapter: chapterIndex + 1,
            sceneCount: chapter.getSceneCount(),
            summary: chapter.getChapterSummary()
        }));
    }
}

// Export classes for use in other modules (if using Node.js modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Detail,
        Entry,
        Scene,
        Chapter,
        Story
    };
}

// Example usage:
/*
// Create a new story
const myStory = new Story();

// Add chapters
const chapter1Index = myStory.addChapter();
const chapter2Index = myStory.addChapter();

// Add scenes to chapter 1
myStory.addSceneToChapter(chapter1Index, "It was a dark and stormy night...", "Introduction to the mysterious evening");
myStory.addSceneToChapter(chapter1Index, "The protagonist enters the old mansion.", "Character arrives at main location");

// Add scenes to chapter 2
myStory.addSceneToChapter(chapter2Index, "Strange noises echo through the halls.", "Building tension and mystery");

// Create an entry
const storyEntry = new Entry("My Horror Story", "Fiction", "Public", "A thrilling horror story");
storyEntry.setDetail("Genre", "Gothic Horror");

// Get story statistics
console.log(myStory.getStoryStats());
*/
