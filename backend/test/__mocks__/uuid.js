let counter = 1;
module.exports = {
  v4: () => {
    const guid = `00000000-0000-0000-0000-00000000000${counter}`;
    counter = (counter % 9) + 1; // Cycle through 1-9
    return guid;
  },
  validate: () => true,
};