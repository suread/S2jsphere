class LCG {
 constructor(seed = 1) {
  // Values are from Numerical Recipes
  // m is modulus, a is multiplier and c is increment
  this.m = Math.pow(2, 32);
  this.a = 1664525;
  this.c = 1013904223;
  this.seed = seed;
 }

 next() {
  this.seed = (this.a * this.seed + this.c) % this.m;
  return this.seed / this.m;
 }
}

module.exports = LCG

// export default LCG
// const lcg = new LCG();
// console.log(lcg.next());
