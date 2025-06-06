let counter = 0;

const nanoid = (size = 8) => {
  counter++;
  const baseId = `test${counter}`;
  if (baseId.length >= size) {
    return baseId.substring(0, size);
  }
  return baseId.padEnd(size, '0');
};

module.exports = { nanoid };
