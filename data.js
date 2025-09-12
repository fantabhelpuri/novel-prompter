// DetailRegistry class - manages detail types and their possible values
class DetailRegistry {
    constructor() {
        this.detailTypes = new Map(); // Map<string, DetailType>
    }

    // Add or update a detail type
    addDetailType(title, valueType = 'text', possibleValues = []) {
        if (!this.detailTypes.has(title)) {
            this.detailTypes.set(title, new DetailType(title, valueType, possibleValues));
        } else {
            // Update existing detail type
            const existingType = this.detailTypes.get(title);
            if (valueType === 'combobox' && possibleValues.length > 0) {
                existingType.addPossibleValues(possibleValues);
            }
        }
        return this.detailTypes.get(title);
    }

    // Add a value to an existing detail type
    addValueToDetailType(title, value, valueType = 'text') {
        if (!this.detailTypes.has(title)) {
            this.addDetailType(title, valueType, valueType === 'combobox' ? [value] : []);
        } else {
            const detailType = this.detailTypes.get(title);
            if (valueType === 'combobox') {
                detailType.addPossibleValue(value);
            }
        }
    }

    // Get all detail type titles
    getDetailTitles() {
        return Array.from(this.detailTypes.keys()).sort();
    }

    // Get possible values for a detail type
    getPossibleValues(title) {
        const detailType = this.detailTypes.get(title);
        return detailType ? detailType.getPossibleValues() : [];
    }

    // Get detail type info
    getDetailType(title) {
        return this.detailTypes.get(title);
    }

    // Check if a detail type exists
    hasDetailType(title) {
        return this.detailTypes.has(title);
    }

    // Get all detail types as object for serialization
    toJSON() {
        const result = {};
        this.detailTypes.forEach((detailType, title) => {
            result[title] = detailType.toJSON();
        });
        return result;
    }

    // Load from JSON data
    fromJSON(data) {
        this.detailTypes.clear();
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(title => {
                const typeData = data[title];
                this.detailTypes.set(title, DetailType.fromJSON(typeData));
            });
        }
    }
}

// DetailType class - represents a specific detail type with its configuration
class DetailType {
    constructor(title, valueType = 'text', possibleValues = []) {
        this.title = title;
        this.valueType = valueType; // 'text' or 'combobox'
        this.possibleValues = new Set(possibleValues); // Set of possible values for combobox type
    }

    // Add possible values
    addPossibleValues(values) {
        values.forEach(value => this.addPossibleValue(value));
    }

    // Add a single possible value
    addPossibleValue(value) {
        if (value && value.trim()) {
            this.possibleValues.add(value.trim());
        }
    }

    // Get possible values as array
    getPossibleValues() {
        return Array.from(this.possibleValues).sort();
    }

    // Set value type
    setValueType(valueType) {
        this.valueType = valueType;
    }

    // Convert to JSON for serialization
    toJSON() {
        return {
            title: this.title,
            valueType: this.valueType,
            possibleValues: this.getPossibleValues()
        };
    }

    // Create from JSON data
    static fromJSON(data) {
        return new DetailType(
            data.title || '',
            data.valueType || 'text',
            data.possibleValues || []
        );
    }
}

/**
 * Detail class - contains title and value fields
 */
class Detail {
    constructor(title = '', value = '') {
        this.title = title; // text
        this.value = value; // text
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
 * Entry class - main entry with title, type, global, description, and details fields
 * UPDATED: global is now boolean, details is now an array of Detail objects
 */
class Entry {
    constructor(title = '', type = '', global = false, description = '', details = []) {
        this.title = title;           // text
        this.type = type;             // text
        this.global = global;         // boolean (changed from text)
        this.description = description; // text
        this.details = details.length > 0 ? details : []; // array of Detail objects (changed from single detail)
    }

    // Method to add detail
    addDetail(title, value) {
        const detail = new Detail(title, value);
        this.details.push(detail);
        return detail;
    }

    // Method to remove detail by index
    removeDetail(index) {
        if (index >= 0 && index < this.details.length) {
            return this.details.splice(index, 1)[0];
        }
        return null;
    }

    // Method to update detail at index
    updateDetail(index, title, value) {
        if (index >= 0 && index < this.details.length) {
            this.details[index].update(title, value);
            return true;
        }
        return false;
    }

    // Method to get entry summary
    getSummary() {
        return {
            title: this.title,
            type: this.type,
            global: this.global,
            description: this.description,
            details: this.details.map(detail => detail.getFormattedDetail())
        };
    }

    static getEntryTypes() {
        return [
            "Character",
            "Location", 
            "Lore",
            "Object",
            "Subplot"
        ];
    }
    
}

// Keep the rest of the classes (Scene, Chapter, Story) unchanged...
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

// SystemPrompt class - stores system prompt configuration
// SystemPrompt class - stores system prompt configuration
class SystemPrompt {
    constructor(systemPrompt = "", styleGuide = "", storyGenre = "Fantasy", tense = "Past", language = "English (US)", pointOfView = "3rd Person", character = "") {
        this.systemPrompt = systemPrompt;
        this.styleGuide = styleGuide;
        this.storyGenre = storyGenre;
        this.tense = tense;
        this.language = language;
        this.pointOfView = pointOfView;
        this.character = character;
    }

    // Method to update system prompt data
    update(systemPrompt, styleGuide, storyGenre, tense, language, pointOfView, character) {
        this.systemPrompt = systemPrompt;
        this.styleGuide = styleGuide;
        this.storyGenre = storyGenre;
        this.tense = tense;
        this.language = language;
        this.pointOfView = pointOfView;
        this.character = character;
    }

    // Get all available fiction genres
    static getGenres() {
        return [
            "Adventure", "Alternate History", "Apocalyptic/Post-Apocalyptic",
            "Bildungsroman", "Bizarro Fiction", "Climate Fiction", "Comedy",
            "Coming of Age", "Contemporary Fiction", "Crime", "Cyberpunk",
            "Dark Fantasy", "Dystopian", "Epic Fantasy", "Epistolary",
            "Erotica", "Fantasy", "Gothic", "Hard Science Fiction",
            "High Fantasy", "Historical Fiction", "Horror", "Humor/Satire",
            "Literary Fiction", "Magic Realism", "Military Fiction",
            "Mystery", "Mythology", "New Adult", "New Weird", "Paranormal",
            "Philosophical Fiction", "Picaresque", "Psychological Fiction",
            "Pulp Fiction", "Romance", "Science Fantasy", "Science Fiction",
            "Slice of Life", "Social Science Fiction", "Space Opera",
            "Speculative Fiction", "Steam punk", "Superhero Fiction",
            "Supernatural", "Suspense", "Sword and Sorcery", "Techno-thriller",
            "Thriller", "Time Travel", "Urban Fantasy", "Utopian",
            "Vampire Fiction", "Weird Fiction", "Western", "Young Adult"
        ];
    }

    // Get tense options
    static getTenses() {
        return ["Past", "Present"];
    }

    // Get language options
    static getLanguages() {
        return [
            "Arabic", "Bengali", "Chinese (Simplified)", "Chinese (Traditional)",
            "Dutch", "English (Australian)", "English (Canadian)", "English (UK)",
            "English (US)", "French (Canadian)", "French (France)", "German",
            "Hindi", "Italian", "Japanese", "Korean", "Portuguese (Brazil)",
            "Portuguese (Portugal)", "Russian", "Spanish (Mexico)", "Spanish (Spain)",
            "Turkish", "Urdu"
        ];
    }

    // Get point of view options
    static getPointsOfView() {
        return [
            "1st Person",
            "2nd Person", 
            "3rd Person",
            "3rd Person (Limited)",
            "3rd Person (Omniscient)"
        ];
    }
}


// Export classes for use in other modules (if using Node.js modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Detail, Entry, Scene, Chapter, Story, SystemPrompt, DetailRegistry, DetailType };
}

