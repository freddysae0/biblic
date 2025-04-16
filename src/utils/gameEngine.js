import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import inquirer from "inquirer";
import storage from "node-persist";

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GameEngine class to handle the biblical text adventure
 */
class GameEngine {
  constructor() {
    this.stories = {};
    this.currentStory = null;
    this.currentSegment = null;
    this.playerStats = {
      faith: 0,
      wisdom: 0,
      obedience: 0,
      compassion: 0,
      knowledge: 0,
      curiosity: 0,
      completedStories: [],
      lastPlayed: null,
    };
    this.storiesDir = path.join(__dirname, "..", "stories");
    this.asciiDir = path.join(__dirname, "..", "assets", "ascii");

    // Initialize storage
    this.initStorage();
  }

  /**
   * Initialize storage for saving progress
   */
  async initStorage() {
    try {
      await storage.init({
        dir: path.join(__dirname, "..", "data", "progress"),
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: "utf8",
        logging: false,
      });
      // console.log(chalk.green("✓ Game progress system initialized"));
    } catch (error) {
      console.error(chalk.red("Error initializing storage:"), error);
    }
  }

  /**
   * Load all available stories
   */
  async loadStories() {
    try {
      const files = fs.readdirSync(this.storiesDir);
      const storyFiles = files.filter((file) => file.endsWith(".json"));

      for (const file of storyFiles) {
        const storyPath = path.join(this.storiesDir, file);
        const storyContent = fs.readFileSync(storyPath, "utf8");
        const story = JSON.parse(storyContent);
        this.stories[story.id] = story;
      }

      console.log(
        chalk.green(`✓ Loaded ${Object.keys(this.stories).length} stories`)
      );
      return Object.keys(this.stories);
    } catch (error) {
      console.error(chalk.red("Error loading stories:"), error);
      return [];
    }
  }

  /**
   * Get list of all available stories
   */
  getAvailableStories() {
    return Object.values(this.stories).map((story) => ({
      id: story.id,
      title: story.title,
      description: story.shortDescription,
    }));
  }

  /**
   * Start a specific story
   * @param {string} storyId - The ID of the story to start
   */
  async startStory(storyId) {
    try {
      if (!this.stories[storyId]) {
        throw new Error(`Story with ID "${storyId}" not found`);
      }

      this.currentStory = this.stories[storyId];
      console.log(chalk.yellow("\n" + "=".repeat(60)));
      console.log(chalk.bold.white(`\n${this.currentStory.title}\n`));
      console.log(chalk.italic.gray(this.currentStory.shortDescription));
      console.log(chalk.yellow("\n" + "=".repeat(60)));

      // Find the intro segment (usually the first one)
      const introSegment = this.currentStory.narrative.find(
        (segment) => segment.id === "intro"
      );
      if (introSegment) {
        await this.displaySegment(introSegment);
      } else {
        // If no intro segment is found, start with the first segment in the array
        await this.displaySegment(this.currentStory.narrative[0]);
      }

      // Update last played
      this.playerStats.lastPlayed = this.currentStory.id;
      await this.saveProgress();
    } catch (error) {
      console.error(chalk.red("Error starting story:"), error.message);
    }
  }

  /**
   * Display a story segment
   * @param {Object} segment - Story segment to display
   */
  async displaySegment(segment) {
    this.currentSegment = segment;

    // Clear the console for better readability
    console.clear();

    // Show ASCII art if available
    if (segment.asciiArt) {
      await this.showAsciiArt(segment.asciiArt);
    }

    // Play sound effect if available
    if (segment.soundEffect) {
      this.playSoundEffect();
    }

    // Display segment text
    console.log("\n" + chalk.white(segment.text) + "\n");

    // Handle segment based on type
    if (segment.choices && segment.choices.length > 0) {
      // This is a choice segment
      await this.handleChoices(segment.choices);
    } else if (segment.next && segment.next !== "end") {
      // This is a narrative segment, continue after user presses a key
      await inquirer.prompt([
        {
          type: "input",
          name: "continue",
          message: chalk.dim("Press ENTER to continue..."),
        },
      ]);

      // Find and display the next segment
      const nextSegment = this.currentStory.narrative.find(
        (s) => s.id === segment.next
      );
      if (nextSegment) {
        await this.displaySegment(nextSegment);
      } else {
        console.error(
          chalk.red(`Error: Next segment "${segment.next}" not found`)
        );
      }
    } else if (segment.next === "end") {
      // This is the end of the story
      console.log(
        chalk.green.bold("\nYou have completed this biblical story!\n")
      );

      // Mark as completed if not already
      if (!this.playerStats.completedStories.includes(this.currentStory.id)) {
        this.playerStats.completedStories.push(this.currentStory.id);
        await this.saveProgress();
      }

      // Show the teaching
      await this.showTeaching();

      // Show challenge questions
      await this.showChallenges();

      // Return to main menu
      return;
    }
  }

  /**
   * Handle choices in a segment
   * @param {Array} choices - Available choices
   */
  async handleChoices(choices) {
    try {
      const choiceOptions = choices.map((choice, index) => ({
        name: choice.text,
        value: index,
      }));

      const { selectedChoice } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedChoice",
          message: chalk.cyan("What will you do?"),
          choices: choiceOptions,
        },
      ]);

      const choice = choices[selectedChoice];

      // Apply effects of the choice
      if (choice.effect) {
        for (const [stat, value] of Object.entries(choice.effect)) {
          this.playerStats[stat] = (this.playerStats[stat] || 0) + value;

          // Show effect message
          if (value > 0) {
            console.log(chalk.green(`\n+${value} ${stat.toUpperCase()}`));
          } else if (value < 0) {
            console.log(chalk.red(`\n${value} ${stat.toUpperCase()}`));
          }
        }

        // Save updated stats
        await this.saveProgress();
      }

      // Find and display the next segment
      const nextSegment = this.currentStory.narrative.find(
        (s) => s.id === choice.next
      );
      if (nextSegment) {
        await this.displaySegment(nextSegment);
      } else {
        console.error(
          chalk.red(`Error: Next segment "${choice.next}" not found`)
        );
      }
    } catch (error) {
      console.error(chalk.red("Error handling choices:"), error);
    }
  }

  /**
   * Show ASCII art from file
   * @param {string} artFile - Name of the ASCII art file without extension
   */
  async showAsciiArt(artFile) {
    try {
      const artFilePath = path.join(this.asciiDir, `${artFile}.txt`);

      if (fs.existsSync(artFilePath)) {
        const art = fs.readFileSync(artFilePath, "utf8");
        console.log(chalk.cyan(art));
      } else {
        // If file doesn't exist, don't show an error to the user
        console.log(chalk.dim("[ASCII art would appear here]"));
      }
    } catch (error) {
      // Silently fail to not interrupt the game
      console.log(chalk.dim("[ASCII art would appear here]"));
    }
  }

  /**
   * Play a sound effect (console bell)
   */
  playSoundEffect() {
    // Use ASCII bell character for sound
    process.stdout.write("\u0007");
  }

  /**
   * Show the teaching section after completing a story
   */
  async showTeaching() {
    console.log(chalk.yellow("\n" + "=".repeat(60)));
    console.log(chalk.bold.yellow("\nTEACHING & LESSONS\n"));

    // Main lesson
    console.log(chalk.bold.white("Main Lesson:"));
    console.log(chalk.white(this.currentStory.teaching.mainLesson));

    // Secondary lessons
    if (
      this.currentStory.teaching.secondaryLessons &&
      this.currentStory.teaching.secondaryLessons.length > 0
    ) {
      console.log(chalk.bold.white("\nOther Lessons:"));
      this.currentStory.teaching.secondaryLessons.forEach((lesson, index) => {
        console.log(chalk.white(`${index + 1}. ${lesson}`));
      });
    }

    // Bible verses
    if (
      this.currentStory.teaching.bibleVerses &&
      this.currentStory.teaching.bibleVerses.length > 0
    ) {
      console.log(chalk.bold.white("\nBible Verses:"));
      this.currentStory.teaching.bibleVerses.forEach((verse) => {
        console.log(chalk.white(`${verse.reference} - ${verse.text}`));
      });
    }

    console.log(chalk.yellow("\n" + "=".repeat(60)));

    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: chalk.dim("Press ENTER to continue to challenges..."),
      },
    ]);
  }

  /**
   * Show challenge questions after a story
   */
  async showChallenges() {
    if (
      !this.currentStory.challenges ||
      this.currentStory.challenges.length === 0
    ) {
      return;
    }

    console.log(chalk.yellow("\n" + "=".repeat(60)));
    console.log(chalk.bold.magenta("\nCHALLENGE QUESTIONS\n"));
    console.log(chalk.white("Test your knowledge about this biblical story:"));

    let correctAnswers = 0;

    for (const [index, challenge] of this.currentStory.challenges.entries()) {
      console.log(chalk.cyan(`\nQuestion ${index + 1}: ${challenge.question}`));

      const options = challenge.options.map((option, i) => ({
        name: option,
        value: i,
      }));

      const { answer } = await inquirer.prompt([
        {
          type: "list",
          name: "answer",
          message: "Your answer:",
          choices: options,
        },
      ]);

      if (answer === challenge.correctAnswer) {
        correctAnswers++;
        this.playSoundEffect();
        console.log(chalk.green("✓ Correct!"));
        if (challenge.explanation) {
          console.log(chalk.gray(challenge.explanation));
        }
      } else {
        console.log(chalk.red("✗ Incorrect!"));
        console.log(
          chalk.gray(
            `The correct answer is: ${challenge.options[challenge.correctAnswer]}`
          )
        );
        if (challenge.explanation) {
          console.log(chalk.gray(challenge.explanation));
        }
      }
    }

    // Show final score
    console.log(chalk.yellow("\n" + "=".repeat(60)));
    console.log(
      chalk.bold.white(
        `\nYou got ${correctAnswers} out of ${this.currentStory.challenges.length} questions correct!`
      )
    );

    // Update knowledge score based on challenge performance
    const knowledgePoints = Math.floor(
      (correctAnswers / this.currentStory.challenges.length) * 10
    );
    this.playerStats.knowledge =
      (this.playerStats.knowledge || 0) + knowledgePoints;
    console.log(chalk.green(`\n+${knowledgePoints} KNOWLEDGE`));

    await this.saveProgress();

    console.log(chalk.yellow("\n" + "=".repeat(60)));

    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: chalk.dim("Press ENTER to return to the main menu..."),
      },
    ]);
  }

  /**
   * Save player progress
   */
  async saveProgress() {
    try {
      await storage.setItem("playerStats", this.playerStats);
    } catch (error) {
      console.error(chalk.red("Error saving progress:"), error);
    }
  }

  /**
   * Load player progress
   */
  async loadProgress() {
    try {
      const savedStats = await storage.getItem("playerStats");
      if (savedStats) {
        this.playerStats = savedStats;
        return true;
      }
      return false;
    } catch (error) {
      console.error(chalk.red("Error loading progress:"), error);
      return false;
    }
  }

  /**
   * Reset player progress
   */
  async resetProgress() {
    try {
      this.playerStats = {
        faith: 0,
        wisdom: 0,
        obedience: 0,
        compassion: 0,
        knowledge: 0,
        curiosity: 0,
        completedStories: [],
        lastPlayed: null,
      };
      await storage.removeItem("playerStats");
      console.log(chalk.green("Progress reset successfully!"));
      return true;
    } catch (error) {
      console.error(chalk.red("Error resetting progress:"), error);
      return false;
    }
  }

  /**
   * Display player progress and stats
   */
  async displayProgress() {
    try {
      await this.loadProgress();

      console.log(chalk.yellow("\n" + "=".repeat(60)));
      console.log(chalk.bold.magenta("\nYOUR PROGRESS\n"));

      // Display attributes
      console.log(chalk.bold.white("Attributes:"));
      console.log(chalk.bold.white("Attributes:"));
      console.log(chalk.cyan(`Faith: ${this.playerStats.faith || 0}`));
      console.log(chalk.cyan(`Wisdom: ${this.playerStats.wisdom || 0}`));
      console.log(chalk.cyan(`Obedience: ${this.playerStats.obedience || 0}`));
      console.log(
        chalk.cyan(`Compassion: ${this.playerStats.compassion || 0}`)
      );
      console.log(chalk.cyan(`Knowledge: ${this.playerStats.knowledge || 0}`));
      console.log(chalk.cyan(`Curiosity: ${this.playerStats.curiosity || 0}`));

      // Display completed stories
      console.log(chalk.bold.white("\nCompleted Stories:"));
      if (
        this.playerStats.completedStories &&
        this.playerStats.completedStories.length > 0
      ) {
        // Load story data to get titles
        const completedIds = this.playerStats.completedStories;
        const availableStories = this.getAvailableStories();

        completedIds.forEach((storyId, index) => {
          const story = availableStories.find((s) => s.id === storyId);
          if (story) {
            console.log(chalk.green(`${index + 1}. ${story.title}`));
          } else {
            console.log(chalk.green(`${index + 1}. ${storyId}`));
          }
        });
      } else {
        console.log(chalk.dim("You have not completed any stories yet."));
      }

      // Last played
      if (this.playerStats.lastPlayed) {
        const story = this.stories[this.playerStats.lastPlayed];
        console.log(chalk.bold.white("\nLast Played:"));
        console.log(
          chalk.cyan(story ? story.title : this.playerStats.lastPlayed)
        );
      }

      console.log(chalk.yellow("\n" + "=".repeat(60)));
    } catch (error) {
      console.error(chalk.red("Error displaying progress:"), error);
    }
  }
}

// Export the GameEngine class
export { GameEngine };
