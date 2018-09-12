'use strict';
// по-моему это лишнее усложенение,
// при чтении кода, натыкаешься на вызов этой функции
// и не сразу понятно что она делает, приходится разбираться и думать :(
function typeChecker(items, instance, errMsg) {
    let _items = items;
    // не опускайте фигурные скобки
    if (!Array.isArray(items)) _items = [items];
    _items.forEach(item => {
        // здесь можно написать if (!item) { return; }
        // так вложенность кода будет меньше
        if (item) {
            // не опускайте фигурные скобки
            if (item instanceof instance) return;
            throw new Error(errMsg || `Неверный тип аргумента - ${item.constructor.name}, ожидается тип ${instance.name}`)
        }
    });
}

const notExistError = new Error(`Не передан обязательный аргумент`);

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    plus(vector) {
        typeChecker(vector, Vector, 'Можно прибавлять к вектору только вектор типа Vector');
        return new Vector(this.x + vector.x, this.y + vector.y);
    }

    times(factor) {
        return new Vector(this.x * factor, this.y * factor);
    }
}

class Actor {
    // тут лучше добавить значения по-умолчанию
    constructor(pos, size, speed) {
        typeChecker([pos, size, speed], Vector);

        // не опускайте аргументы,
        // можно получить ошибку, которую сложно отловить
        // если кто-то изменит значения по-умолчанию
        this.pos = pos || new Vector();
        this.size = size || new Vector(1, 1);
        this.speed = speed || new Vector();
    }

    get type() {
        return 'actor';
    }

    get left() {
        return this.pos.x;
    }

    get top() {
        return this.pos.y;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }

    act() {
    }

    isIntersect(actor) {
        // вторая проверка включает в себя первую
        // сообщения, правда, будут разными,
        // по-моему можно только вторую оставить
        if (!actor) throw notExistError;
        typeChecker(actor, Actor);

        // не опускайте фигурные скобки
        if (actor === this) return false;

        // скобки мохно опустить, хотя с ними хорошо читается
        const horizontalIntersect = (actor.right > this.left) && (actor.left < this.right);
        const verticalIntersect = (actor.bottom > this.top) && (actor.top < this.bottom);

        return horizontalIntersect && verticalIntersect;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = actors.find(actor => actor.type === 'player');
        this.height = grid.length;
        // здесь можно использовать сокращённую форму запили стрелочной функции
        this.width = grid.reduce((acc, string) => {
            return Math.max(acc, string.length);
        }, 0);
        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
        // можно проверить status на неравенство null и убрать двойное отрицание
        // (код будет чуть понятнее)
        return !!(this.status && this.finishDelay < 0);
    }

    actorAt(actor) {
        // см. выше
        if (!actor) throw notExistError;
        typeChecker(actor, Actor);

        // для поиска объекта в массиве можно использовать специальный метод
        for (let act of this.actors) {
            if (act.isIntersect(actor)) {
                return act;
            }
        }
    }

    obstacleAt(pos, size) {
        typeChecker([pos, size], Vector);
        const left = pos.x;
        const right = pos.x + size.x;
        const top = pos.y;
        const bottom = pos.y + size.y;

        // не опускайте фигурные скобки
        if (bottom > this.height) return 'lava';
        if (left < 0 || right > this.width || top < 0) return 'wall';

        // округлённые значения можно созранить в переменных,
        // чтобы не округлять на каждой итерации
        for (let x = Math.floor(left); x < right; x++) {
            for (let y = Math.floor(top); y < bottom; y++) {
                const obstacle = this.grid[y][x];
                if (obstacle) return obstacle;
            }
        }
    }

    removeActor(actor) {
        typeChecker(actor, Actor);
        // если объект не будет найден в массиве,
        // то метод отработает неправильно
        this.actors.splice(this.actors.indexOf(actor), 1);
    }

    noMoreActors(type) {
        // есть специальный метод для определения
        // есть ли в массиве объекты удовлетворяющие условию
        if (type) return !this.actors.filter(actor => actor.type === type).length;
        return !this.actors.length;
    }

    playerTouched(object, actor) {
        switch (object) {
            case 'fireball':
            case 'lava': {
                this.status = 'lost';
                break;
            }
            case 'coin' : {
                if (actor instanceof Actor) {
                    this.removeActor(actor);
                }
                if (this.noMoreActors('coin')) {
                    this.status = 'won';
                }
            }
        }
    }
}

class LevelParser {

    // лучше добавить значение по-умолчанию,
    // чтобы не проверять дальше по коду
    constructor(map) {
        this.map = map;
        this.obstacleMap = {
            'x': 'wall',
            '!': 'lava',
        };
    }

    actorFromSymbol(symbol) {
        // проверка лишняя
        if (symbol) return this.map[symbol];
    }

    obstacleFromSymbol(symbol) {
        // проверка лишняя
        if (symbol) return this.obstacleMap[symbol];
    }

    createGrid(plan) {
        return plan.map(string => string.split('').map(symbol => this.obstacleFromSymbol(symbol)));
    }

    createActors(plan) {
        const result = [];
        if (!this.map || !plan.length) return result;

        plan.forEach((string, y) => {
            string.split('').forEach((symbol, x) => {
                // дублирование логики actorFromSymbol
                if (typeof this.map[symbol] !== 'function') return;
                if (!(new this.map[symbol]() instanceof Actor)) return;

                // вы создаёте объект 2 раза,
                // лучше делать это 1 раз
                const actorConstructor = this.actorFromSymbol(symbol);
                const actor = new actorConstructor(new Vector(x, y));
                result.push(actor);
            });

        });

        return result;
    }

    parse(plan) {
        const grid = this.createGrid(plan);
        const actors = this.createActors(plan);
        return new Level(grid, actors);
    }
}

class Fireball extends Actor {

    constructor(pos, speed) {
        // второй аргумент неправильный (размер огненного шара нам известен)
        super(pos, undefined, speed);
    }
    get type() {
        return 'fireball';
    }

    getNextPosition(times = 1) {
        return this.pos.plus(this.speed.times(times));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        const nextPosition = this.getNextPosition(time);
        const isObstacle = level.obstacleAt(nextPosition, this.size);
        if (!isObstacle) {
            this.pos = nextPosition;
        } else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(2,0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0,2));
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0,3));
        this.initialPos = pos;
    }

    handleObstacle() {
        this.pos = this.initialPos;
    }
}

class Coin extends Actor {
    constructor(pos) {
        super(pos, new Vector(0.6, 0.6));
        const movedPosition = this.pos.plus(new Vector(0.2, 0.1));
        // this.pos лучше задавать через конструктор родительского класса
        this.pos = movedPosition;
        this.initPosition = movedPosition;
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * ( 2 * Math.PI - Math.PI);
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.initPosition.plus(this.getSpringVector());
    }

    act(time = 1) {
        this.pos = this.getNextPosition(time);
    }

}

class Player extends Actor {
    constructor(pos) {
        super(pos, new Vector(0.8, 1.5));
        // this.pos лучше задавать через конструктор родительского класса
        this.pos = this.pos.plus(new Vector(0, -0.5))
    }

    get type() {
        return 'player';
    }
}

loadLevels()
    .then(res => JSON.parse(res))
    .then(schemas => {
    const actorDict = {
        '@': Player,
        'v': FireRain,
        'o': Coin,
        '=': HorizontalFireball,
        '|': VerticalFireball,
    };

    const parser = new LevelParser(actorDict);
    runGame(schemas, parser, DOMDisplay)
        .then(() => console.log('Вы выиграли приз!'));

});