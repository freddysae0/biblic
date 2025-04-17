# Biblic Game

An interactive biblical text adventure game with moral teachings and challenges.

![Biblic Game](https://i.ibb.co/Rkb84b2W/main.png)
![Noah](https://i.ibb.co/b5Ztbqvp/noah1.png)
![Jose](https://i.ibb.co/p6HcQYVx/jose1.png)
![Jose](https://i.ibb.co/GQ4XjzT3/jose2.png)
## Description

Biblic Game is a command-line interactive text adventure that brings biblical stories to life through engaging narratives, meaningful choices, and educational challenges. It combines storytelling with moral teachings and spiritual lessons, allowing players to experience famous biblical stories in a new and interactive way.

Players can make choices that affect their character attributes like faith, wisdom, courage, and more. After completing each story, they'll be tested with challenge questions to reinforce their understanding of biblical teachings.

## Installation

### Prerequisites

- Node.js (v18.0.0 or higher)
- pnpm package manager (recommended)

### Installation Steps

1. Just run:
   ```bash
   npm install -g biblic
   ```

## How to Play

### Starting the Game

You can start the game by simply typing:
```bash
biblic start
```

Or use one of the available commands:
```bash
biblic start    # Start the main menu
biblic list     # List all available stories
biblic progress # View your progress
biblic reset    # Reset your game progress
biblic help     # Display help information
```

### Gameplay

1. **Select a Story**: Choose from available biblical stories or let the game randomly select one for you.

2. **Make Choices**: Throughout each story, you'll face decisions that affect your character's development and the narrative flow.

3. **Learn Lessons**: After completing a story, review the moral teachings and biblical references.

4. **Test Your Knowledge**: Answer challenge questions to test your understanding of the biblical narrative.

5. **Track Progress**: Your progress and character attributes (faith, wisdom, etc.) are saved between sessions.

## Available Stories

1. **David and Goliath**: Face the giant Philistine with faith and courage.
2. **Joseph and the Coat of Many Colors**: The journey of a dreamer who overcame betrayal and rose to power through faith and forgiveness.
3. **Noah's Ark**: Experience the great flood and God's covenant with Noah.
4. More stories to come!

## Game Features

- **Interactive Storytelling**: Experience biblical narratives with meaningful choices
- **Character Development**: Grow in faith, wisdom, courage, and other attributes
- **ASCII Art**: Visual elements enhance the storytelling experience
- **Sound Effects**: Simple terminal bell sounds at important moments
- **Progress Tracking**: Save and resume your journey
- **Bible Teachings**: Learn moral lessons and spiritual insights
- **Challenge Questions**: Test your understanding of the stories

## Extending the Game

Developers can easily add new stories by:
1. Creating a new JSON file in the `src/stories` directory following the established format
2. Adding ASCII art files in `src/assets/ascii`
3. The game will automatically detect and include the new story

## Requirements

- Node.js (>= 18.0.0)
- Terminal with UTF-8 support
- Basic keyboard navigation

## Credits and Biblical References

This game is based on stories from the Bible. It aims to be educational and respectful of biblical narratives while making them interactive and engaging. Any liberties taken with the narratives are for gameplay purposes only.

## License

ISC License

## Contributing

Contributions are welcome! Feel free to:
- Add new biblical stories
- Improve ASCII art
- Enhance gameplay mechanics
- Fix bugs or improve performance

Please submit a pull request with your changes.

