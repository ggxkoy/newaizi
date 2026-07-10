// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

import { _decorator } from "cc";
const { ccclass } = _decorator;

@ccclass("lodash")
export class lodash {
    /* class member could be defined like this */
    // dummy = '';

    public static find (collection, predicate) {
        var result;
        if (!Array.isArray(collection)) {
            collection = this.toArray(collection);
        }

        result = collection.filter(predicate);
        if (result.length) {
            return result[0];
        }

        return undefined;
    }

    public static forEach(collection, iteratee) {
        if (!Array.isArray(collection)) {
            var array = this.toArrayKey(collection);
            array.forEach(function (value, index, arr) {
                var key1 = value['key'];
                var value1 = value['value'];
                iteratee(value1, key1, collection);
            });
        } else {
            collection.forEach(iteratee);
        }
    }

    public static cloneDeep(sObj) {
        if (sObj === null || typeof sObj !== "object") {
            return sObj;
        }

        var s = {};
        if (sObj.constructor === Array) {
            s = [];
        }

        for (var i in sObj) {
            if (sObj.hasOwnProperty(i)) {
                s[i] = this.cloneDeep(sObj[i]);
            }
        }

        return s;
    }

    public static map(collection, iteratee) {
        if (!Array.isArray(collection)) {
            collection = this.toArray(collection);
        }

        var arr = [];
        collection.forEach(function (value, index, array) {
            arr.push(iteratee(value, index, array));
        });

        return arr;
    }

    public static random(min, max) {
        var r = Math.random();
        var rr = r * (max - min + 1) + min;
        return Math.floor(rr);
    }

    public static toArrayKey(srcObj) {
        var resultArr = [];

        // to array
        for (var key in srcObj) {
            if (!srcObj.hasOwnProperty(key)) {
                continue;
            }

            resultArr.push({ key: key, value: srcObj[key] });
        }

        return resultArr;
    }

    public static toArray(srcObj) {
        var resultArr = [];

        // to array
        for (var key in srcObj) {
            if (!srcObj.hasOwnProperty(key)) {
                continue;
            }

            resultArr.push(srcObj[key]);
        }

        return resultArr;
    }

    public static filter(collection, iteratees) {
        if (!Array.isArray(collection)) {
            collection = this.toArray(collection);
        }

        return collection.filter(iteratees);
    }

    public static isEqual(x, y) {
        var in1 = x instanceof Object;
        var in2 = y instanceof Object;
        if (!in1 || !in2) {
            return x === y;
        }

        if (Object.keys(x).length !== Object.keys(y).length) {
            return false;
        }

        for (var p in x) {
            var a = x[p] instanceof Object;
            var b = y[p] instanceof Object;
            if (a && b) {
                return this.isEqual(x[p], y[p]);
            } else if (x[p] !== y[p]) {
                return false;
            }
        }

        return true;
    }

    public static pullAllWith(array, value, comparator) {
        value.forEach(function (item) {
            var res = array.filter(function (n) {
                return comparator(n, item);
            });

            res.forEach(function (item) {
                var index = array.indexOf(item);
                if (array.indexOf(item) !== -1) {
                    array.splice(index, 1);
                }
            });
        });

        return array;
    }

    public static now() {
        return Date.now();
    }

    public static pullAll(array, value) {
        value.forEach(function (item) {
            var index = array.indexOf(item);
            if (array.indexOf(item) !== -1) {
                array.splice(index, 1);
            }
        });

        return array;
    }

    public static forEachRight(collection, iteratee) {
        if (!Array.isArray(collection)) {
            collection = this.toArray(collection);
        }

        for (var i = collection.length - 1; i >= 0; i--) {
            var ret = iteratee(collection[i]);
            if (!ret) break;
        }
    }

    public static startsWith(str, target, position) {
        str = str.substr(position);
        return str.startsWith(target);
    }

    public static endsWith(str, target, position) {
        str = str.substr(position);
        return str.endsWith(target);
    }

    public static remove(array, predicate) {
        var result = [];
        var indexes = [];
        array.forEach(function (item, index) {
            if (predicate(item)) {
                result.push(item);
                indexes.push(index);
            }
        });

        this.basePullAt(array, indexes);
        return result;
    }

    public static basePullAt(array, indexes) {
        var length = array ? indexes.length : 0;
        var lastIndex = length - 1;
        var previous;

        while (length--) {
            var index = indexes[length];
            if (length === lastIndex || index !== previous) {
                previous = index;
                Array.prototype.splice.call(array, index, 1);
            }
        }

        return array;
    }

    public static findIndex(array, predicate, fromIndex) {
        array =  array.slice(fromIndex);
        var i;
        if (typeof predicate === "function") {
            for (i = 0; i < array.length; i++) {
                if (predicate(array[i])) {
                    return i;
                }
            }
        } else if (Array.isArray(predicate)) {
            for (i = 0; i < array.length; i++) {
                var key = predicate[0];
                var vaule = true;
                if (predicate.length > 1) {
                    vaule = predicate[1];
                }

                if (array[i][key] === vaule) {
                    return i;
                }
            }
        } else {
            for (i = 0; i < array.length; i++) {
                if (array[i] === predicate) {
                    return i;
                }
            }
        }

        return -1;
    }

    public static concat() {
        var length = arguments.length;
        if (!length) {
            return [];
        }

        var array = arguments[0];
        var index = 1;
        while (index < length) {
            array = array.concat(arguments[index]);
            index++;
        }

        return array;
    }

    public static isNumber(value) {
        return typeof value === 'number';
    }

    public static indexOf(array, value, fromIndex) {
        array =  array.slice(fromIndex);
        return array.indexOf(value);
    }

    public static join(array, separator) {
        if (array === null) return '';

        var result = '';
        array.forEach(function (item) {
            result += item + separator;
        });

        return result.substr(0, result.length - 1);
    }

    public static split(string, separator, limit) {
        return string.split(separator, limit);
    }

    public static max(array) {
        if (array && array.length) {
            var result;
            for (var i = 0; i < array.length; i++) {
                if (i === 0) {
                    result = array[0];
                } else if (result < array[i]) {
                    result = array[i];
                }
            }

            return result;
        }

        return undefined;

    }

    public static drop(array, n) {
        var length = array === null ? 0 : array.length;
        if (!length) {
            return [];
        }

        return array.slice(n);
    }

    public static flattenDeep(arr) {
        return arr.reduce(function (prev, cur) {
            return prev.concat(Array.isArray(cur) ? this.flattenDeep(cur) : cur);
        }, [ ]);
    }

    public static uniq(array) {
        var result = [];
        array.forEach(function (item) {
            if (result.indexOf(item) === -1) {
                result.push(item);
            }
        });

        return result;
    }

    public static isNaN(value) {
        // An `NaN` primitive is the only value that is not equal to itself.
        // Perform the `toStringTag` check first to avoid errors with some
        // ActiveX objects in IE.
        return this.isNumber(value) && value !== +value;
    }

    public static chunk(array, size) {
        var length = array === null ? 0 : array.length;
        if (!length || size < 1) {
            return [];
        }

        var result = [];
        while (array.length > size) {
            result.push(array.slice(0, size));
            array = array.slice(size);
        }

        result.push(array);
        return result;
    }

    public static toFinite(value) {
        var INFINITY = 1 / 0;
        var MAX_INTEGER = 1.7976931348623157e+308;
        if (!value) {
            return value === 0 ? value : 0;
        }
        value = Number(value);
        if (value === INFINITY || value === -INFINITY) {
            var sign = (value < 0 ? -1 : 1);
            return sign * MAX_INTEGER;
        }
        return value === value ? value : 0;
    }

    public static baseRange(start, end, step, fromRight) {
        var nativeMax = Math.max;
        var nativeCeil = Math.ceil;
        var index = -1,
            length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
            result = Array(length);

        while (length--) {
            result[fromRight ? length : ++index] = start;
            start += step;
        }
        return result;
    }

    public static isObject(value) {
        var type = typeof value;
        return value !== null && (type === 'object' || type === 'function');
    }

    public static MAX_SAFE_INTEGER = 9007199254740991;

    public static isLength(value) {
        return typeof value === 'number' &&
            value > -1 && value % 1 === 0 && value <= lodash.MAX_SAFE_INTEGER;
    }

    public static isArrayLike(value) {
        return value !== null && this.isLength(value.length) /*&& !isFunction(value)*/;
    }

    public static eq(value, other) {
        return value === other || (value !== value && other !== other);
    }

    public static isIndex(value, length) {
        var type = typeof value;
        length = length === null ? lodash.MAX_SAFE_INTEGER : length;
        var reIsUint = /^(?:0|[1-9]\d*)$/;
        return !!length &&
            (type === 'number' ||
            (type !== 'symbol' && reIsUint.test(value))) &&
            (value > -1 && value % 1 === 0 && value < length);
    }

    public static isIterateeCall(value, index, object) {
        if (!this.isObject(object)) {
            return false;
        }
        var type = typeof index;
        if (type === 'number' ?
                (this.isArrayLike(object) && this.isIndex(index, object.length))
                : (type === 'string' && index in object)
        ) {
            return this.eq(object[index], value);
        }
        return false;
    }

    public static createRange(fromRight) {
        return function(start, end, step) {
            if (step && typeof step !== 'number' && this.isIterateeCall(start, end, step)) {
                end = step = undefined;
            }
            // Ensure the sign of `-0` is preserved.
            start = this.toFinite(start);
            if (end === undefined) {
                end = start;
                start = 0;
            } else {
                end = this.toFinite(end);
            }
            step = step === undefined ? (start < end ? 1 : -1) : this.toFinite(step);
            return this.baseRange(start, end, step, fromRight);
        };
    }

    public static maxBy(array, predicate) {
        if (array && array.length) {
            var result;
            var objResult;
            for (var i = 0; i < array.length; i++) {
                if (i === 0) {
                    result = predicate(array[0]);
                    objResult = array[0];
                } else if (result < array[i]) {
                    result = (array[i]);
                    objResult = array[i];
                }
            }

            return objResult;
        }

        return undefined;

    }

    public static minBy(array, predicate) {
        if (array && array.length) {
            var result;
            var objResult;
            for (var i = 0; i < array.length; i++) {
                if (i === 0) {
                    result = predicate(array[0]);
                    objResult = array[0];
                } else if (result > array[i]) {
                    result = predicate(array[i]);
                    objResult = array[i];
                }
            }

            return objResult;
        }

        return undefined;

    }

    public static sumBy(collection, predicate) {
        var sum = 0;
        for (var key in collection) {
            sum += predicate(collection[key]);
        }

        return sum;
    }

    public static countBy(collection, predicate) {
        var objRet = {};
        for (var key in collection) {
            var value = collection[key];
            if (objRet.hasOwnProperty(value)) {
                objRet[value] += 1;
            } else {
                objRet[value] = 1;
            }
        }

        return objRet;
    }
    
}
