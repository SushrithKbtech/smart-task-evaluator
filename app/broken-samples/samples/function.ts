// app/broken-samples/samples/function.ts

const brokenFunction = `
function findUnique(arr) {
  let unique = [];

  for (let i = 0; i < arr.length; i++) {
    let exists = false;

    for (let j = 0; j < arr.length; j++) {
      if (arr[i] === arr[j] && i !== j) {
        exists = true;
      }
    }

    if (!exists) {
      unique.push(arr[i]);
    }
  }

  return unique;
}

console.log(findUnique([1,2,2,3,4,4,5]));
`;

export default brokenFunction;
