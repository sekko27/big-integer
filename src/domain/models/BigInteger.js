"use strict";

const DIGIT_0 = "0".charCodeAt(0);
const DIGIT_9 = "9".charCodeAt(0);

function isZero(big) {
  for (let i=big.length-1; i>=0; i--) {
    if (big.digits[i] != 0) {
      return false;
    }
  }
  return true;
}
/**
 * Comparing big integers without signs, i.e: |big1| ? |big2|
 * Parameters can contain leading zeros in their digits.
 *
 * @param big1
 * @param big2
 * @returns {number} more then zero if |big1| < |big2|, less then zero if |big1| > |big2|, otherwise zero
 */
function compareWithoutSign(big1, big2) {
  let index1, index2;
  for (index1 = big1.length - 1; big1.digits[index1] == 0; index1--) {}
  for (index2 = big2.length - 1; big2.digits[index2] == 0; index2--) {}
  if (index1 != index2) {
    return index2 - index1;
  }
  for (; index1 >= 0; index1--) {
    let d1 = big1.digits[index1];
    let d2 = big2.digits[index1];
    if (d1 != d2) {
      return d2 - d1;
    }

  }
  return 0;
}

/**
 * Addition of two big integer.
 * @param big1
 * @param big2
 * @returns {Uint8Array}
 */
function digitsOfSumWithoutSign(big1, big2) {
  const length = Math.max(big1.length, big2.length) + 1;
  const result = new Uint8Array(length);
  let carry = 0;
  for (let i = 0; i < length; i++) {
    let thisDigit = i<big1.length ? big1.digits[i] : 0;
    let otherDigit = i<big2.length ? big2.digits[i] : 0;
    let digitSum = thisDigit + otherDigit + carry;
    carry = digitSum >= 10 ? 1 : 0;
    result[i] = digitSum - carry * 10;
  }
  return result;
}

function subtractSmallerFromBigger(bigger, smaller) {
  const length = Math.max(bigger.length, smaller.length);
  const result = new Uint8Array(length);
  let carry = 0;
  for (let i = 0; i< length; i++) {
    let biggerDigit = i<bigger.length ? bigger.digits[i] : 0;
    let smallerDigit = i<smaller.length ? smaller.digits[i] : 0;
    let subtraction = biggerDigit - smallerDigit - carry;
    carry = subtraction < 0 ? 1 : 0;
    result[i] = subtraction + carry * 10;
  }
  return result;
}

function subtractOfPositives(big1, big2) {
  let comparison = compareWithoutSign(big1, big2);
  if (comparison == 0) {
    return BigInteger.ZERO;
  } else if (comparison > 0) {
    return new BigInteger(subtractSmallerFromBigger(big2, big1), true);
  } else {
    return new BigInteger(subtractSmallerFromBigger(big1, big2), false);
  }
}

class BigInteger {

  static convertToArray(representation) {
    if (representation instanceof Uint8Array) {
      return representation;
    } else if (typeof representation == 'number') {
      return BigInteger.convertToArray(parseInt(representation).toString());
    } else if (typeof representation == 'string') {
      const length = representation.length;
      if (length == 0) {
        throw new TypeError("Big integer can not be instantiated from empty string");
      }
      const result = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        const char = representation.charCodeAt(i);
        if (char < DIGIT_0 || char > DIGIT_9) {
          throw new RangeError("Decimal string representation must contain digits between 0 and 9: " + representation);
        }
        result[length - 1 - i] = representation.charCodeAt(i) - DIGIT_0;
      }
      return result;
    } else {
      throw new TypeError("Decimal representation must be string or Uint8Array");
    }
  }

  /**
   * Construct new BigInteger instance.
   *
   * @param representation String|Uint8Array Decimal representation. If it's in Uint8Array it should be reverse ordered.
   * @param negative
     */
  constructor(representation, negative) {
    if (representation instanceof BigInteger) {
      return representation;
    }
    this.digits = BigInteger.convertToArray(representation);
    this.length = this.digits.length;
    this.negative = negative === true;
    this.isZero = isZero(this);
  }

  get realLength() {
    for (let index = this.digits.length-1; index>=0; index--) {
      if (this.digits[index] != 0) {
        return index+1;
      }
    }
    // All digits is zero, so it's zero
    return 1;
  }

  negate() {
    return new BigInteger(this.digits, !this.negative);
  }

  add(other) {
    if (this.isZero) {
      return other;
    } else if (other.isZero) {
      return this;
    }

    if (this.negative === other.negative) {
      return new BigInteger(digitsOfSumWithoutSign(this, other), this.negative);
    } else if (this.negative) {
      return subtractOfPositives(other, this.negate());
    } else {
      return subtractOfPositives(this, other.negate());
    }
  }

  subtract(other) {
    if (this.isZero) {
      return other.negate();
    } else if (other.isZero) {
      return this;
    }
    if (this.negative !== other.negative) {
      return new BigInteger(digitsOfSumWithoutSign(this, other), this.negative);
    } else if (this.negative) {
      return subtractOfPositives(other, this);
    } else {
      return subtractOfPositives(this, other);
    }
  }

  multiply(other) {
    if (this.isZero || other.isZero) {
      return BigInteger.ZERO;
    }
    const otherLength = other.realLength;
    const thisLength = this.realLength;
    const result = new Uint8Array(otherLength + thisLength);
    let carry = 0;
    for (let indexOther=0; indexOther<otherLength; indexOther++) {
      let otherDigit = other.digits[indexOther];
      carry = 0;
      for (let indexThis=0; indexThis<thisLength; indexThis++) {
        let sum = otherDigit * this.digits[indexThis] + carry + result[indexOther + indexThis];
        carry = 0;
        while (sum >= 10) {
          sum -= 10;
          carry++;
        }
        result[indexOther + indexThis] = sum;
      }
      result[indexOther + thisLength] += carry;
    }
    //result[otherLength + thisLength - 1] = carry;
    return new BigInteger(result, this.negative !== other.negative);
  }

  toString() {
    let clone = this.digits.slice(0, this.realLength);
    return (this.negative ? "-" : "") + clone.reverse().join("");
  }
}

BigInteger.ZERO = new BigInteger(new Uint8Array([0]));
BigInteger.ONE  = new BigInteger(new Uint8Array([1]));

module.exports = BigInteger;
