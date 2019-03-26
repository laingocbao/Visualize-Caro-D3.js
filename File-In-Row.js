var ma = {
    games: {},
    players: {},
    views: {},
    utils: {}
};

(function() {

    var Match = function(options) {
        this.game = options.game;
        this.players = options.players;
        this.currentGameIndex = 0;
        this.reset();
    };

    Match.prototype = {

        constructor: Match,

        playToEnd: function() {
            while (this.isNext()) {
                this.next();
                this.trigger("fix", this.curGame());
            }
        },

        curGame: function() {
            return this.gameHistory[this.currentGameIndex];
        },

        setChange: function(index) {
            this.currentGameIndex = index;
            this.trigger("change", this.curGame());
        },

        getSize: function() {
            return this.gameHistory.length;
        },

        getCurrentIndex: function() {
            return this.currentGameIndex;
        },

        getGame: function(ply) {
            if (!ply) {
                return this.gameHistory[this.currentGameIndex];
            }
            return this.gameHistory[ply];
        },

        getMove: function(gameIndex) {
            return this.moveHistory[gameIndex];
        },

        isStart: function() {
            return this.currentGameIndex > 0;
        },

        isEnd: function() {
            return this.currentGameIndex < this.gameHistory.length - 1;
        },

        isOver: function() {
            return this.gameHistory[this.gameHistory.length - 1].isGameOver();
        },

        isNext: function() {
            return (this.currentGameIndex !== this.gameHistory.length - 1) ||
                (!this.gameHistory[this.gameHistory.length - 1].isGameOver());
        },

        isPrev: function() {
            return this.currentGameIndex > 0;
        },

        start: function() {
            if (this.isStart()) {
                this.currentGameIndex = 0;
                this.trigger("start", this.curGame());
            }
        },

        prev: function() {
            if (this.isPrev()) {
                this.currentGameIndex--;
                this.trigger("previous", this.curGame());
            }
        },

        copy: function() {

        },

        next: function() {
            if (!this.isNext()) {
                return;
            }
            var gameCopy = this.gameHistory[this.gameHistory.length - 1].copy();
            if (this.currentGameIndex === this.gameHistory.length - 1) {
                var player = this.players[gameCopy.currentPlayer()];
                var moveIndex = (typeof player == "function") ? player(gameCopy) : player.move(gameCopy);
                var moveString = gameCopy.moves()[moveIndex];
                gameCopy.move(moveIndex);
                if (!this.gameHistory[this.gameHistory.length - 1].equals(gameCopy)) {
                    this.gameHistory.push(gameCopy);
                    this.moveHistory.push(moveString);
                    this.currentGameIndex++;
                    this.trigger("fix", this.curGame());
                }
            } else {
                this.currentGameIndex++;
                this.trigger("fix", this.curGame());
            }
        },

        end: function() {
            if (this.isEnd()) {
                this.currentGameIndex = this.gameHistory.length - 1;
                this.trigger("end", this.curGame());
            }
        },

        reset: function() {
            this.currentGameIndex = 0;
            this.moveHistory = [];
            this.gameHistory = [this.game.newGame()];
            this.trigger("reset", this.curGame());
        }

    };

    _.extend(Match.prototype, Backbone.Events);
    ma.Match = Match;

})();


(function() {

    var FiveInRow = function(options) {
        this.size = 15;
        this.crosses = this.noughts = 0;
        this.movesCached = this.indexMovesCached = null;
        options || (options = {});
        if (options.board) {
            this.setBoard(options.board);
        }
    };

    FiveInRow.PATTERNS = [7, 56, 448, 73, 146, 292, 273, 84];

    FiveInRow.LETTERS = ['A', 'B', 'C'];

    FiveInRow.prototype = {

        constructor: FiveInRow,

        ///////////////////////////
        // Lai Ngoc Bao Game Interface //
        ///////////////////////////

        copy: function() {
            var fiveInRow = new FiveInRow();
            fiveInRow.crosses = this.crosses;
            fiveInRow.noughts = this.noughts;
            return fiveInRow;
        },

        currentPlayer: function() {
            return (this.emptyCells() + 1) % 2;
        },

        isGameOver: function() {
            return this.moves().length === 0;
        },

        move: function(move) {
            if (this.isGameOver()) {
                throw new Error("Can't make more moves, the game is over!");
            }
            var moves = this.moves();
            // Make random move if no move given
            if (arguments.length === 0) {
                move = Math.floor(Math.random() * moves.length);
            } else if (typeof move === 'string') {
                for (var i = 0; i < moves.length; i++) {
                    if (move === moves[i]) {
                        move = i;
                        break;
                    }
                }
            }
            if (move < 0 || move >= moves.length) {
                throw new RangeError('Illegal move');
            }
            var bitboardMove = (1 << this.indexMoves()[move]);
            this.setCurrentBitboard(this.getCurrentBitboard() | bitboardMove);
            this.clearCache();
            return this;
        },

        moves: function() {
            if (this.movesCached === null) {
                this.movesCached = [];
                var indexMove = this.indexMoves();
                for (var i = 0; i < indexMove.length; i++) {
                    var row = Math.floor(indexMove[i] / 15);
                    var col = (indexMove[i] % 15) + 1;
                    this.movesCached.push(FiveInRow.LETTERS[row] + col.toString());
                }
            }
            return this.movesCached;
        },

        newGame: function() {
            return new FiveInRow();
        },

        numPlayers: function() {
            return 2;
        },

        outcomes: function() {
            if (!this.isGameOver()) {
                return ['NA', 'NA'];
            }
            if (this.checkBitboardWin(this.crosses)) {
                return ['WIN', 'LOSS'];
            }
            if (this.checkBitboardWin(this.noughts)) {
                return ['LOSS', 'WIN'];
            }
            return ['DRAW', 'DRAW'];
        },

        reset: function() {
            this.crosses = this.noughts = 0;
            this.clearCache();
            return this;
        },

        toString: function() {
            var builder = '';
            if (!this.isGameOver()) {
                builder += 'Player: ' + this.currentPlayer() + '\n';
                builder += 'Moves: ' + this.moves() + '\n';
            } else {
                builder += 'Game Over!\n';
            }
            builder += '\n';
            for (var i = 0; i < 9; i++) {
                if ((this.crosses & (1 << i)) !== 0) {
                    builder += ' X ';
                } else if ((this.noughts & (1 << i)) !== 0) {
                    builder += ' O ';
                } else {
                    builder += ' - ';
                }
                if (i % 15 === 14) {
                    builder += '\n';
                }
            }
            return builder;
        },

        //////////////////////////
        // Five In Row specific //
        //////////////////////////

        bitCount: function(num) {
            var count = 0;
            for (var i = 0; i < 9; i++) {
                if ((num & (1 << i)) > 0) {
                    count++;
                }
            }
            return count;
        },

        cell: function(row, col) {
            return this.cellIndex(this.size * row + col);
        },

        cellIndex: function(cellIndex) {
            if ((this.crosses & (1 << cellIndex)) !== 0) {
                return 'CROSS';
            }
            if ((this.noughts & (1 << cellIndex)) !== 0) {
                return 'NOUGHT';
            }
            return 'EMPTY';
        },

        checkBitboardWin: function(board) {
            for (var i = 0; i < FiveInRow.PATTERNS.length; i++) {
                if ((board & FiveInRow.PATTERNS[i]) === FiveInRow.PATTERNS[i]) {
                    return true;
                }
            }
            return false;
        },

        clearCache: function() {
            this.movesCached = this.indexMovesCached = null;
        },

        emptyCells: function() {
            return 9 - this.bitCount(this.crosses | this.noughts);
        },

        equals: function(other) {
            return this.crosses === other.crosses && this.noughts === other.noughts;
        },

        getCurrentBitboard: function() {
            return this.currentPlayer() === 0 ? this.crosses : this.noughts;
        },

        indexMoves: function() {
            if (this.indexMovesCached === null) {
                this.indexMovesCached = [];
                if (!this.isWin()) {
                    var emptyCellsBitboard = ~(this.crosses | this.noughts);
                    for (var i = 0; i < 9; i++) {
                        if ((emptyCellsBitboard & (1 << i)) !== 0) {
                            this.indexMovesCached.push(i);
                        }
                    }
                }
            }
            return this.indexMovesCached;
        },

        isWin: function() {
            return this.checkBitboardWin(this.crosses) || this.checkBitboardWin(this.noughts);
        },

        setBoard: function(board) {
            for (var row = 0; row < board.length; row++) {
                for (var col = 0; col < board[row].length; col++) {
                    var value = board[row][col];
                    if (value === 'X') {
                        this.crosses |= (1 << ((row * this.size) + col));
                    } else if (value === 'O') {
                        this.noughts |= (1 << ((row * this.size) + col));
                    }
                }
            }
        },

        setCurrentBitboard: function(bitboard) {
            var currentBitboard = (this.currentPlayer() === 0) ? 'crosses' : 'noughts';
            this[currentBitboard] = bitboard;
        }

    };

    ma.games = ma.games || {};
    ma.games.FiveInRow = FiveInRow;

}());

ma.players.alphaBeta = function(options) {
    options = options || {};
    var maxDepth = options.maxDepth || Number.MAX_VALUE,
        evalFunc = options.evalFunc || ma.utilFunc;
    return function(game) {
        return (function alphaBeta(game, curDepth, alpha, beta) {
            if (game.isGameOver() || curDepth === maxDepth) {
                return { score: evalFunc(game, game.currentPlayer()) };
            }
            var bestMove = null,
                bestScore = -Number.MAX_VALUE,
                moves = game.moves();
            for (var move = 0; move < moves.length; move++) {
                var moveScore = alphaBeta(game.copy().move(move), curDepth + 1, -beta, -Math.max(alpha, bestScore));
                var curScore = -moveScore.score;
                if (curScore > bestScore) {
                    bestMove = move;
                    bestScore = curScore;
                    if (bestScore >= beta) {
                        return { move: bestMove, score: bestScore };
                    }
                }
            }
            return { move: bestMove, score: bestScore };
        }(game, 0, -Number.MAX_VALUE, Number.MAX_VALUE)).move;
    };
};


ma.players.MCTS = function(options) {
    options = options || {};
    this.treePolicy = options.treePolicy;
    this.defaultPolicy = options.defaultPolicy;
    this.numSims = options.numSims;
    this.utilFunc = options.utilFunc || ma.utilFunc;
};

ma.players.MCTS.prototype = {

    constructor: ma.players.MCTS,

    copy: function() {
        return new ma.MCTS(this.treePolicy, this.defaultPolicy, this.numSims);
    },

    simulate: function(curPos, player) {
        var visitedNodes = this.simTree(curPos, player),
            lastNode = visitedNodes[visitedNodes.length - 1],
            outcome = this.simDefault(lastNode, player);
        this.backup(visitedNodes, outcome);
    },

    simTree: function(curPos, player) {
        var nodes = [],
            curNode = curPos;
        while (!curNode.game.isGameOver()) {
            nodes.push(curNode);
            var lastNode = nodes[nodes.length - 1];
            if (lastNode.count === 0) {
                this.newNode(lastNode, player);
                return nodes;
            }
            var move = this.treePolicy.move(nodes[nodes.length - 1], player); // TODO refactor
            curNode = curNode.children[move];
        }
        nodes.push(curNode);
        return nodes;
    },

    simDefault: function(node, player) {
        var copy = node.game.copy();
        while (!copy.isGameOver()) {
            copy.move(this.defaultPolicy.move(copy));
        }
        return this.utilFunc(copy, player);
    },

    backup: function (visitedNodes, outcome) {
        visitedNodes.forEach(function(node) {
            node.update(outcome);
        });
    },

    newNode: function(node, player) { // todo remove this?
        node.init();
    },

    // Player Interface

    move: function(game) {
        game = game.copy();
        var root = new ma.players.MCTSNode(game);
        var curPlayer = game.currentPlayer();
        for (var i = 0; i < this.numSims; i++) {
            this.simulate(root, curPlayer);
        }
        return this.treePolicy.move(root, curPlayer);
    }

};

ma.players.MCTSNode = function(game) {
    this.game = game;
    this.count = 0;
    this.value = 0.0;
    this.children = [];
};

ma.players.MCTSNode.prototype = {

    constructor: ma.players.MCTSNode,

    init: function() {
        var moves = this.game.moves();
        for (var move = 0; move < moves.length; move++) {
            var newGame = this.game.copy();
            newGame.move(move);
            this.children.push(new ma.players.MCTSNode(newGame));
        }
    },

    update: function(outcome) {
        this.count++;
        this.value += (outcome - this.value) / this.count;
    },

    actionCount: function(move) {
        return this.children[move].count; // TODO refactor
    },

    actionValue: function(move) {
        return this.children[move].value; // TODO refactor
    }

};

///////////////////
// Tree policies //
///////////////////

ma.players.UCB1 = function(options) {
    options = options || {};
    this.c = options.c; // TODO add random number generator
};

ma.players.UCB1.prototype = {

    constructor: ma.players.UCB1,

    move: function(node, player) {
        var bestMove = -1,
            max = node.game.currentPlayer() === player,
            bestValue = max ? -Number.MAX_VALUE : Number.MAX_VALUE,
            nb = 0,
            moves = node.game.moves();
        for (var move = 0; move < moves.length; move++) {
            nb += node.actionCount(move);
        }
        for (move = 0; move < moves.length; move++) {
            var value = 0;

            // ensures that each arm is selected once before further exploration
            if (node.actionCount(move) === 0)
            {
                var bias = (Math.random() * 1000) + 10;
                value = max ? (100000000 - bias) : (-100000000 + bias); // TODO: refactor
            }
            else
            {
                var exploitation = node.actionValue(move);
                var exploration = this.c * Math.sqrt(Math.log(nb) / node.actionCount(move));
                value += exploitation;
                value += max ? exploration : -exploration;
            }

            if (max)
            {
                if (value > bestValue) {
                    bestMove = move;
                    bestValue = value;
                }
            }
            else if (value < bestValue) { // min
                bestMove = move;
                bestValue = value;
            }
        }
        return bestMove;
    }

};

ma.players.minimax = function(options) {
    options = options || {};
    var maxDepth = options.maxDepth || Number.MAX_VALUE,
        evalFunc = options.evalFunc || ma.utilFunc;
    return function(game) {
        var player = game.currentPlayer();
        return (function minimax(game, curDepth) {
            if (game.isGameOver() || curDepth === maxDepth) {
                return { score: evalFunc(game, player) };
            }
            var bestMove = null,
                bestScore = game.currentPlayer() === player ? -Number.MAX_VALUE : Number.MAX_VALUE,
                moves = game.moves();
            for (var move = 0; move < moves.length; move++) {
                var moveScore = minimax(game.copy().move(move), curDepth + 1);
                if (game.currentPlayer() === player) {
                    if (moveScore.score > bestScore) {
                        bestMove = move;
                        bestScore = moveScore.score;
                    }
                } else if (moveScore.score < bestScore) {
                    bestMove = move;
                    bestScore = moveScore.score;
                }
            }
            return { move: bestMove, score: bestScore };
        }(game, 0)).move;
    };
};


ma.players.monteCarlo = function(options) {
    options = options || {};
    var numSims = options.numSims || 5000,
        evalFunc = options.evalFunc || ma.utilFunc;
    return function(game) {
        var moves = game.moves();
        if (moves.length === 1) {
            return 0;
        }
        var outcomes = Array.apply(null, new Array(moves.length)).map(Number.prototype.valueOf, 0);
        for (var i = 0; i < numSims; i++) {
            var newGame = game.copy();
            var move = i % moves.length;
            newGame.move(move);
            while (!newGame.isGameOver()) {
                var randMove = Math.floor(Math.random() * newGame.moves().length);
                newGame.move(randMove);
            }
            outcomes[move] += evalFunc(newGame, game.currentPlayer());
        }
        return ma.argMax(outcomes);
    };
};


ma.players.negamax = function(options) {
    options = options || {};
    var maxDepth = options.maxDepth || Number.MAX_VALUE,
        evalFunc = options.evalFunc || ma.utilFunc;
    return function(game) {
        return (function negamax(game, curDepth) {
            if (game.isGameOver() || curDepth === maxDepth) {
                return { score: evalFunc(game, game.currentPlayer()) };
            }
            var bestMove = null,
                bestScore = -Number.MAX_VALUE,
                moves = game.moves();
            for (var move = 0; move < moves.length; move++) {
                var moveScore = negamax(game.copy().move(move), curDepth + 1);
                var curScore = -moveScore.score;
                if (curScore > bestScore) {
                    bestMove = move;
                    bestScore = curScore;
                }
            }
            return { move: bestMove, score: bestScore };
        }(game, 0)).move;
    };
};


ma.players.Random = function() {

};

ma.players.Random.prototype = {

    constructor: ma.players.Random,

    move: function(game) {
        return Math.floor(Math.random() * game.numMoves());
    }

};

ma.players.randomFunc = function(game) {
    return Math.floor(Math.random() * game.numMoves());
};

(function() {

    ma = ma || {};

    ma.argMax = function(outcomes) {
            var maxArg = 0,
                maxValue = outcomes[0];
            for (var i = 1; i < outcomes.length; i++) {
                if (outcomes[i] > maxValue) {
                    maxArg = i;
                    maxValue = outcomes[i];
                }
            }
            return maxArg;
    };

    ma.playRandomGame = function(game) {
        console.log(game.toString());
        while (!game.isGameOver()) {
            game.move();
            console.log(game.toString());
        }
    };

    ma.playNGames = function(game, players, numGames) {
        var stats = {
            oneWins: 0,
            twoWins: 0,
            draws: 0
        };
        for (var i = 0; i < numGames; i++) {
            var newGame = game.copy();
            while (!newGame.isGameOver()) {
                var curPlayer = players[newGame.currentPlayer()];
                var move = curPlayer.move(newGame);
                newGame.move(move);
            }
            var outcomes = newGame.outcomes();
            if (outcomes[0] === 'WIN') {
                stats.oneWins++;
            } else if (outcomes[1] === 'WIN') {
                stats.twoWins++;
            } else {
                stats.draws++;
            }
        }
        return stats;
    };

    ma.windowToCanvas = function(canvas, x, y) {
        var bbox = canvas.getBoundingClientRect();
        return {
            x: x - bbox.left * (canvas.width / bbox.width),
            y: y - bbox.top * (canvas.height / bbox.height)
        };
    };

    ma.utilFunc = function(game, player) {
        if (game.isGameOver()) {
            var outcomes = game.outcomes();
            switch (outcomes[player]) {
                case 'WIN':
                    return 1.0;
                case 'DRAW':
                    return 0.0;
                case 'LOSS':
                    return -1.0;
            }
        }
    };

}());

(function() {

    var ControlsView = function(options) {
        this.match = options.match;
        this.initElements();
        this.addListeners();
    };

    ControlsView.prototype = {

        constructor: ControlsView,

        initElements: function() {
            this.el = document.createElement("div");
            this.buttons = {
                start: document.createElement("button"),
                prev: document.createElement("button"),
                next: document.createElement("button"),
                end: document.createElement("button")
            };
            this.buttons.start.innerHTML = "|&#60;";
            this.buttons.prev.innerHTML = "&#60;";
            this.buttons.next.innerHTML = "&#62;";
            this.buttons.end.innerHTML = "&#62;|";
            this.el.appendChild(this.buttons.start);
            this.el.appendChild(this.buttons.prev);
            this.el.appendChild(this.buttons.next);
            this.el.appendChild(this.buttons.end);
        },

        addListeners: function () {
            this.buttons.start.addEventListener("click", function() {
                this.match.start();
            }.bind(this));
            this.buttons.prev.addEventListener("click", function() {
                this.match.prev();
            }.bind(this));
            this.buttons.next.addEventListener("click", function() {
                this.match.next();
            }.bind(this));
            this.buttons.end.addEventListener("click", function() {
                this.match.end();
            }.bind(this));
        },

        render: function() {
            return this.el;
        },

        update: function() {
            this.buttons.start.disabled = !this.match.isStart();
            this.buttons.prev.disabled = !this.match.isPrev();
            this.buttons.next.disabled = !this.match.isNext();
            this.buttons.end.disabled = !this.match.isEnd();
        }

    };

    ma.views.ControlsView = ControlsView;

}());

(function() {

    var InfoView = function(options) {
        this.model = options.model;
        this.el = options.el;
        this.update(null, this.model);
    };

    InfoView.prototype = {

        constructor: InfoView,

        update: function(event, model) {
            this.model = model;
            if (this.model.isGameOver()) {
                var outcomes = this.model.outcomes();
                if (outcomes[0] === "WIN") {
                    this.el.innerHTML = "Player 1 Wins!";
                } else if (outcomes[1] === "WIN") {
                    this.el.innerHTML = "Player 2 Wins!";
                } else {
                    this.el.innerHTML = "Draw!";
                }
            } else {
                var curPlayer = this.model.currentPlayer() + 1;
                this.el.innerHTML = "Turn: Player " + curPlayer;
            }
        }

    };

    ma.views.InfoView = InfoView;

}());

(function() {

    var RestartView = function(options) {
        this.match = options.match;
        this.el = options.el;
        this.update();
        this.addListener();
    };

    RestartView.prototype = {

        constructor: RestartView,

        addListener: function () {
            this.el.addEventListener("click", function() {
                this.match.reset();
            }.bind(this));
        },

        // Match Events

        update: function() {
            this.el.disabled = !this.match.isStart();
        }

    };

    ma.views.RestartView = RestartView;

}());

(function() {

    var CanvasPlayer = function(options) {
        this.moveChosen = null;
        this.match = options.match;
        this.canvasView = options.canvasView;
        this.canvas = options.canvasView.canvas;
        this.addListeners();
    };

    CanvasPlayer.prototype = {

        constructor: CanvasPlayer,

        move: function() {
            if (!this.moveChosen) {
                throw new Error("No move chosen!");
            }
            var selMove = this.moveChosen;
            this.moveChosen = null;
            return selMove;
        },

        // Listeners

        addListeners: function() {
            this.addClickListener();
            this.addMouseMoveListener();
            this.addMouseOutListener();
        },

        addClickListener: function () {
            this.canvas.addEventListener("click", function(event) {
                if (this.match.curGame().currentPlayer() === 0) {
                    var canvasLoc = ma.utils.windowToCanvas(this.canvas, event.clientX, event.clientY);
                    var move = this.canvasView.canvasLocationToMove(canvasLoc);
                    var moves = this.match.curGame().moves();
                    if (_.contains(moves, move)) {
                        this.moveChosen = move;
                        this.match.next();
                        this.canvasView.render(); // TODO Move somewhere else?
                        this.match.next();
                        // TODO add trigger()?
                    }
                }
            }.bind(this));
        },

        addMouseMoveListener: function () {
            this.canvas.addEventListener("mousemove", function(event) {
                if (this.match.curGame().currentPlayer() === 0) {
                    var canvasLoc = ma.utils.windowToCanvas(this.canvas, event.clientX, event.clientY);
                    var move = this.canvasView.canvasLocationToMove(canvasLoc);
                    var moves = this.match.curGame().moves();
                    if (_.contains(moves, move)) {
                        this.canvasView.highlightedMoves = [move];
                        this.canvasView.render();
                    }
                }
            }.bind(this));
        },

        addMouseOutListener: function () {
            this.canvas.addEventListener("mouseout", function() {
                this.canvasView.highlightedMoves = [];
                this.canvasView.render();
            }.bind(this));
        }

    };

    ma.views = ma.views || {};
    ma.views.CanvasPlayer = CanvasPlayer;

}());

(function() {

    var FiveInRow = ma.games.FiveInRow;

    var FiveInRowCanvas = function(options) {
        this.model = options.model;
        this.canvas = options.canvas || document.createElement('canvas');
        this.canvas.width = options.width || 100;
        this.canvas.height = options.height || 100;
        this.ctx = this.canvas.getContext('2d');
        this.squareSize = this.canvas.width / this.model.size;
        this.cellPer = 0.7;
        this.colors = {
            bg: 'rgb(255, 219, 122)',
            border: 'rgb(229, 197, 110)',
            cross: 'rgba(231, 76, 60, 1.0)',
            crossLight: 'rgba(231, 76, 60, 0.5)',
            nought: 'rgba(41, 128, 185,1.0)',
            noughtLight: 'rgba(41, 128, 185, 0.5)'
        };
        this.highlightedMoves = [];
        this.borderSize = 0.02; // percentage
        this.linesWidth = Math.round(this.canvas.width * this.borderSize);
        this.render();
    };

    FiveInRowCanvas.squareToMove = function(row, col) {
        return FiveInRow.LETTERS[row] + (col + 1);
    };

    FiveInRowCanvas.prototype = {

        constructor: FiveInRowCanvas,

        render: function() {
            this.drawBackground();
            this.drawLines();
            this.drawBorder();
            this.drawSquares();
            return this.canvas;
        },

        getCurPlayerColor: function() {
            return this.model.currentPlayer() === 0 ? this.colors.crossLight : this.colors.noughtLight;
        },

        drawBackground: function() {
            this.ctx.fillStyle = this.colors.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        },

        drawBorder: function() {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.colors.border;
            this.ctx.lineWidth = this.linesWidth;
            this.ctx.strokeRect(this.linesWidth / 2,
                    this.linesWidth / 2,
                    this.canvas.width - this.linesWidth,
                    this.canvas.height - this.linesWidth);
        },

        drawLines: function() {
            this.ctx.lineWidth = Math.round(this.canvas.width * this.borderSize);
            for (var i = 1; i < this.model.size; i++) {
                this.drawVerticalLine(i);
                this.drawHorizontalLine(i);
            }
        },

        drawSquares: function() {
            for (var row = 0; row < this.model.size; row++) {
                for (var col = 0; col < this.model.size; col++) {
                    var cellType = this.model.cell(row, col);
                    var hello = FiveInRowCanvas.squareToMove(row, col);
                    if (cellType === 'CROSS') {
                        this.drawCross(row, col, this.colors.cross);
                    } else if (cellType === 'NOUGHT') {
                        this.drawNought(row, col, this.colors.nought);
                    } else if (!this.model.frozen && !this.model.isGameOver() && _.contains(this.highlightedMoves, hello)) {
                        var color = this.getCurPlayerColor();
                        if (this.model.currentPlayer() === 0) {
                            this.drawCross(row, col, color);
                        } else if (this.model.currentPlayer() === 1) {
                            this.drawNought(row, col, color);
                        }
                    }
                }
            }
        },

        drawHorizontalLine: function (row) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * this.squareSize);
            this.ctx.lineTo(this.canvas.width, row * this.squareSize);
            this.ctx.stroke();
        },

        drawVerticalLine: function (col) {
            this.ctx.strokeStyle = this.colors.border;
            this.ctx.beginPath();
            this.ctx.moveTo(col * this.squareSize, 0);
            this.ctx.lineTo(col * this.squareSize, this.canvas.height);
            this.ctx.stroke();
        },

        drawCross: function (row, col, color) {
            var space = this.squareSize * ((1 - this.cellPer)),
                x = col * this.squareSize,
                y = row * this.squareSize;

            this.ctx.lineWidth = this.linesWidth * 2; // TODO make it relative to size
            this.ctx.strokeStyle = color;
            this.ctx.lineCap = 'round';

            this.ctx.beginPath();

            // Top Left to Bottom Right
            this.ctx.moveTo(x + space, y + space);
            this.ctx.lineTo(x + this.squareSize - space, y + this.squareSize - space);

            // Bottom Left to Top Right
            this.ctx.moveTo(x + space, y + this.squareSize - space);
            this.ctx.lineTo(x + this.squareSize - space, y + space);

            this.ctx.stroke();
        },

        drawNought: function (row, col, color) {
            this.ctx.beginPath();
            var centerX = col * this.squareSize + (this.squareSize / 2),
                centerY = row * this.squareSize + (this.squareSize / 2),
                radius = this.squareSize / 2 * this.cellPer,
                startAngle = 0,
                endAngle = 2 * Math.PI,
                counterClockwise = false;
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle, counterClockwise);
            this.ctx.fillStyle = color;
            this.ctx.fill();
        },

        // Callbacks

        update: function(event, model) {
            this.model = model;
            this.render();
        },

        // Clickable

        coordToSquare: function(x, y) {
            return {
                row: Math.floor(y / this.squareSize),
                col: Math.floor(x / this.squareSize)
            };
        },

        canvasLocationToMove: function(loc) {
            var square = this.coordToSquare(loc.x, loc.y);
            return FiveInRowCanvas.squareToMove(square.row, square.col);
        }

    };

    ma.views = ma.views || {};
    ma.views.FiveInRowCanvas = FiveInRowCanvas;

}());

(function() {

    var FiveInRowSVG = function(options) {
        this.model = options.model;
        this.sideLength = options.sideLength;
        this.svg = options.svg || document.createElement("svg");
        this.svg = d3.select(this.svg).append("g");
        this.svg.attr("transform", "scale(2.0)");
        this.colors = {
            bg: "rgb(255, 219, 122)",
            border: "rgb(229, 197, 110)",
            cross: "rgba(231, 76, 60, 1.0)",
            crossLight: "rgba(231, 76, 60, 0.5)",
            nought: "rgba(41, 128, 185,1.0)",
            noughtLight: "rgba(41, 128, 185, 0.5)"
        };
        this.lineWidth = this.sideLength * 0.02;
        this.borderWidth = this.sideLength * 0.04;
        this.render();
    };

    FiveInRowSVG.squareToMove = function(row, col) {
        return ma.games.FiveInRow.LETTERS[row] + (col + 1);
    };

    FiveInRowSVG.prototype.render = function() {
        this.drawBackground();
        this.drawLines();
        this.drawBorder();
        this.drawSquares();
        return this;
    };

    FiveInRowSVG.prototype.drawBackground = function() {
        this.svg.append("rect")
            .attr({
                "class": "bg",
                "x": 0,
                "y": 0,
                "width": this.sideLength,
                "height": this.sideLength,
                "fill": this.colors.bg,
                "stroke": "none"
            });
    };

    FiveInRowSVG.prototype.drawLines = function() {
        for (var i = 1; i < this.model.size; i++) {
            this.drawVerticalLine(i);
            this.drawHorizontalLine(i);
        }
    };

    FiveInRowSVG.prototype.drawBorder = function() {
        this.svg.append("rect")
            .attr({
                "class": "border",
                "x": 0,
                "y": 0,
                "width": this.sideLength,
                "height": this.sideLength,
                "fill": "none",
                "stroke": this.colors.border,
                "stroke-width": this.borderWidth
            });
    };

    FiveInRowSVG.prototype.drawHorizontalLine = function (row) {
        this.svg.append("line")
            .attr("x1", 0)
            .attr("y1", (this.sideLength / 15) * row)
            .attr("x2", this.sideLength)
            .attr("y2", (this.sideLength / 15) * row)
            .attr("stroke", this.colors.border)
            .attr("stroke-width", this.lineWidth);
    };

    FiveInRowSVG.prototype.drawVerticalLine = function (col) {
        this.svg.append("line")
            .attr("x1", (this.sideLength / 15) * col)
            .attr("y1", 0)
            .attr("x2", (this.sideLength / 15) * col)
            .attr("y2", this.sideLength)
            .attr("stroke", this.colors.border)
            .attr("stroke-width", this.lineWidth);
    };

    FiveInRowSVG.prototype.drawSquares = function() {
        for (var row = 0; row < this.model.size; row++) {
            for (var col = 0; col < this.model.size; col++) {
                var cellType = this.model.cell(row, col);
                if (cellType === 'CROSS') {
                    this.drawCross(row, col, this.colors.cross);
                } else if (cellType === 'NOUGHT') {
                    this.drawCircle(row, col, this.colors.nought);
                }
            }
        }
    };

    FiveInRowSVG.prototype.drawCross = function (row, col, color) {
        var scale = d3.scale.ordinal().domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]).rangeRoundBands([0, this.sideLength], 1, 0.5),
            cellSize = this.sideLength / 11;

        this.svg.append("line")
            .attr("x1", function() {
                return scale(col) - cellSize;
            })
            .attr("y1", function() {
                return scale(row) - cellSize;
            })
            .attr("x2", function() {
                return scale(col) + cellSize;
            })
            .attr("y2", function() {
                return scale(row) + cellSize;
            })
            .attr("stroke", color)
            .attr("stroke-width", this.sideLength / 30);

        this.svg.append("line")
            .attr("x1", function() {
                return scale(col) - cellSize;
            })
            .attr("y1", function() {
                return scale(row) + cellSize;
            })
            .attr("x2", function() {
                return scale(col) + cellSize;
            })
            .attr("y2", function() {
                return scale(row) - cellSize;
            })
            .attr("stroke", color)
            .attr("stroke-width", this.sideLength / 30);
    };

    FiveInRowSVG.prototype.drawCircle = function (row, col, color) {

        var scale = d3.scale.ordinal().domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]).rangeRoundBands([0, this.sideLength], 1, 0.5);

        this.svg
            .append("circle")
            .attr("cx", function() {
                return scale(col);
            })
            .attr("cy", function() {
                return scale(row);
            })
            .attr("r", this.sideLength * 0.1)
            .attr("fill", color);
    };

    FiveInRowSVG.prototype.update = function(event, model) {
        this.model = model;
        this.render();
    };

    ma.views = ma.views || {};
    ma.views.FiveInRowSVG = FiveInRowSVG;

})();
