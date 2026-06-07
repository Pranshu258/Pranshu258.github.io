"""
Renju game engine — Python port of src/renju/ai.js
Uses 0-indexed (row, col) grid coordinates.  Black=1, White=-1, Empty=0.
"""

import numpy as np
from functools import lru_cache

BOARD_SIZE = 15
EMPTY, BLACK, WHITE = 0, 1, -1

# Four directions: (drow, dcol)
DIRECTIONS = [(0, 1), (1, 0), (1, 1), (1, -1)]

# 8-way neighbours
NEIGHBOURS = [(-1,-1),(-1, 0),(-1, 1),(0,-1),(0, 1),(1,-1),(1, 0),(1, 1)]

# ─── Scoring constants ────────────────────────────────────────────────────────
WIN         = 100
DOUBLE_FOUR = 90
FOUR_THREE  = 85
DOUBLE_THREE= 80
BLOCK_FOUR  = 75
FOUR_OPEN   = 70
FOUR_HALF   = 50
BROKEN_FOUR = 45
BLOCK_THREE = 35
THREE_OPEN  = 30
THREE_HALF  = 15
JUMP_THREE  = 12
TWO_OPEN    = 5
TWO         = 3
CENTER_BONUS= 2

# ─── Board utilities ──────────────────────────────────────────────────────────

def empty_board():
    return np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.int8)

def board_from_moves(black_moves, white_moves):
    board = empty_board()
    for r, c in black_moves:
        board[r, c] = BLACK
    for r, c in white_moves:
        board[r, c] = WHITE
    return board

def on_board(r, c):
    return 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE


# ─── Win checking ─────────────────────────────────────────────────────────────

def check_five(board, r, c, color):
    """Return True if there are exactly 5 (Black) or 5+ (White) stones of color through (r, c).
    The stone at (r, c) must already be placed on the board."""
    if board[r, c] != color:
        return False
    for dr, dc in DIRECTIONS:
        count = 1
        for n in range(1, 6):
            nr, nc = r + dr*n, c + dc*n
            if on_board(nr, nc) and board[nr, nc] == color:
                count += 1
            else:
                break
        for n in range(1, 6):
            nr, nc = r - dr*n, c - dc*n
            if on_board(nr, nc) and board[nr, nc] == color:
                count += 1
            else:
                break
        if color == BLACK:
            if count == 5:
                return True
        else:
            if count >= 5:
                return True
    return False


def get_winning_line(board, r, c, color):
    """Return the five winning cells or None."""
    for dr, dc in DIRECTIONS:
        line = [(r, c)]
        for n in range(1, 6):
            nr, nc = r + dr*n, c + dc*n
            if on_board(nr, nc) and board[nr, nc] == color:
                line.append((nr, nc))
            else:
                break
        for n in range(1, 6):
            nr, nc = r - dr*n, c - dc*n
            if on_board(nr, nc) and board[nr, nc] == color:
                line.append((nr, nc))
            else:
                break
        if color == BLACK and len(line) == 5:
            return line
        if color == WHITE and len(line) >= 5:
            return line[:5]
    return None


# ─── Forbidden move detection (Black only) ───────────────────────────────────

def _would_create_overline(board, r, c):
    for dr, dc in DIRECTIONS:
        count = 1
        for n in range(1, 6):
            nr, nc = r + dr*n, c + dc*n
            if on_board(nr, nc) and board[nr, nc] == BLACK:
                count += 1
            else:
                break
        for n in range(1, 6):
            nr, nc = r - dr*n, c - dc*n
            if on_board(nr, nc) and board[nr, nc] == BLACK:
                count += 1
            else:
                break
        if count > 5:
            return True
    return False


def _count_fours(board, r, c):
    """How many separate 'open fours' does placing BLACK at (r,c) create?"""
    count = 0
    for dr, dc in DIRECTIONS:
        stones = 1
        open_pos = False
        open_neg = False
        for n in range(1, 5):
            nr, nc = r + dr*n, c + dc*n
            if on_board(nr, nc) and board[nr, nc] == BLACK:
                stones += 1
            else:
                if on_board(nr, nc) and board[nr, nc] == EMPTY:
                    open_pos = True
                break
        for n in range(1, 5):
            nr, nc = r - dr*n, c - dc*n
            if on_board(nr, nc) and board[nr, nc] == BLACK:
                stones += 1
            else:
                if on_board(nr, nc) and board[nr, nc] == EMPTY:
                    open_neg = True
                break
        if stones == 4 and (open_pos or open_neg):
            count += 1
    return count


def _count_open_threes(board, r, c):
    """How many open threes does placing BLACK at (r,c) create?"""
    count = 0
    for dr, dc in DIRECTIONS:
        stones = 1
        open_pos = open_neg = False
        space_pos = space_neg = False
        for n in range(1, 4):
            nr, nc = r + dr*n, c + dc*n
            if on_board(nr, nc) and board[nr, nc] == BLACK:
                stones += 1
            else:
                if on_board(nr, nc) and board[nr, nc] == EMPTY:
                    open_pos = True
                    nn_r, nn_c = r + dr*(n+1), c + dc*(n+1)
                    if on_board(nn_r, nn_c) and board[nn_r, nn_c] != WHITE:
                        space_pos = True
                break
        for n in range(1, 4):
            nr, nc = r - dr*n, c - dc*n
            if on_board(nr, nc) and board[nr, nc] == BLACK:
                stones += 1
            else:
                if on_board(nr, nc) and board[nr, nc] == EMPTY:
                    open_neg = True
                    nn_r, nn_c = r - dr*(n+1), c - dc*(n+1)
                    if on_board(nn_r, nn_c) and board[nn_r, nn_c] != WHITE:
                        space_neg = True
                break
        if stones == 3 and open_pos and open_neg and (space_pos or space_neg):
            count += 1
    return count


def is_forbidden_black(board, r, c):
    """
    Check if placing BLACK at (r,c) is a forbidden move.
    Returns (forbidden: bool, reason: str | None)
    """
    if _would_create_overline(board, r, c):
        return True, 'overline'
    if _count_fours(board, r, c) >= 2:
        return True, 'double-four'
    if _count_open_threes(board, r, c) >= 2:
        return True, 'double-three'
    return False, None


# ─── Move generation ─────────────────────────────────────────────────────────

MAX_CANDIDATES = 10

def get_candidate_moves(board, is_black):
    """Return up to MAX_CANDIDATES promising moves near existing stones."""
    occupied = set(zip(*np.where(board != EMPTY)))
    if not occupied:
        return [(BOARD_SIZE // 2, BOARD_SIZE // 2)]

    candidates = set()
    for r, c in occupied:
        for dr, dc in NEIGHBOURS:
            nr, nc = r + dr, c + dc
            if on_board(nr, nc) and board[nr, nc] == EMPTY:
                candidates.add((nr, nc))

    # Filter forbidden moves for Black
    if is_black:
        legal = [(r, c) for r, c in candidates
                 if not is_forbidden_black(board, r, c)[0]]
        if legal:
            candidates = set(legal)

    # Score & sort
    color = BLACK if is_black else WHITE
    scored = [(quick_score(board, r, c, color), r, c) for r, c in candidates]
    scored.sort(reverse=True)
    return [(r, c) for _, r, c in scored[:MAX_CANDIDATES]]


def quick_score(board, r, c, color):
    """Lightweight move score for ordering."""
    opp = -color
    score = 0
    center = BOARD_SIZE // 2

    for dr, dc in DIRECTIONS:
        own = opp_cnt = open_ends = 0
        for sgn in (1, -1):
            for n in range(1, 5):
                nr, nc = r + dr*sgn*n, c + dc*sgn*n
                if not on_board(nr, nc):
                    break
                if board[nr, nc] == color:
                    own += 1
                elif board[nr, nc] == EMPTY:
                    open_ends += 1
                    break
                else:
                    break
        for sgn in (1, -1):
            for n in range(1, 5):
                nr, nc = r + dr*sgn*n, c + dc*sgn*n
                if not on_board(nr, nc):
                    break
                if board[nr, nc] == opp:
                    opp_cnt += 1
                else:
                    break

        if own >= 4:   score += WIN
        elif own == 3 and open_ends == 2: score += FOUR_OPEN
        elif own == 3: score += FOUR_HALF
        elif own == 2 and open_ends == 2: score += THREE_OPEN
        elif own == 2: score += THREE_HALF
        elif own == 1 and open_ends == 2: score += TWO_OPEN
        elif own == 1: score += TWO

        if opp_cnt >= 4: score += BLOCK_FOUR
        elif opp_cnt >= 3: score += BLOCK_THREE

    dist = abs(r - center) + abs(c - center)
    if dist < 4:
        score += CENTER_BONUS
    return score


# ─── Board evaluation ────────────────────────────────────────────────────────

def evaluate(board, last_r, last_c, color):
    """Full evaluation of the last move placed."""
    if last_r is None:
        return 0

    opp = -color

    if check_five(board, last_r, last_c, color):
        return WIN

    if check_five(board, last_r, last_c, opp):
        return BLOCK_FOUR

    open_fours = open_threes = 0

    for dr, dc in DIRECTIONS:
        own = opp_cnt = open_ends = 0
        for sgn in (1, -1):
            for n in range(1, 5):
                nr, nc = last_r + dr*sgn*n, last_c + dc*sgn*n
                if not on_board(nr, nc):
                    break
                if board[nr, nc] == color:
                    own += 1
                elif board[nr, nc] == EMPTY:
                    open_ends += 1
                    break
                else:
                    break
        for sgn in (1, -1):
            for n in range(1, 5):
                nr, nc = last_r + dr*sgn*n, last_c + dc*sgn*n
                if not on_board(nr, nc):
                    break
                if board[nr, nc] == opp:
                    opp_cnt += 1
                else:
                    break

        if own >= 3 and open_ends >= 1:
            open_fours += 1
        elif own == 2 and open_ends == 2:
            open_threes += 1

        if opp_cnt >= 4:
            return BLOCK_FOUR
        if opp_cnt >= 3:
            return BLOCK_THREE

    if open_fours >= 2:  return DOUBLE_FOUR
    if open_fours >= 1 and open_threes >= 1: return FOUR_THREE
    if open_threes >= 2: return DOUBLE_THREE

    if open_fours >= 1:  return FOUR_OPEN

    center = BOARD_SIZE // 2
    dist = abs(last_r - center) + abs(last_c - center)
    if dist < 4:
        return CENTER_BONUS
    return 0


# ─── Minimax with alpha-beta ──────────────────────────────────────────────────

def minimax(board, depth, max_depth, alpha, beta, color, is_black, last_move, table):
    """
    Negamax formulation.
    color:    color of the current player to move
    is_black: whether the top-level player (depth=0) is Black
    Returns (score, best_move) only at depth==0; otherwise just score.
    """
    # Transposition lookup
    key = board.tobytes()
    if key in table and table[key][0] >= max_depth - depth:
        cached_depth, cached_score, cached_move = table[key]
        return (cached_score, cached_move) if depth == 0 else cached_score

    # Terminal / leaf
    lr, lc = last_move if last_move else (None, None)
    if depth == max_depth or (lr is not None and check_five(board, lr, lc, -color)):
        # Negate: evaluate returns the score from -color's (previous mover's) perspective;
        # negamax requires the score from the current player's perspective.
        score = -evaluate(board, lr, lc, -color) if lr is not None else 0
        return (score, None) if depth == 0 else score

    current_is_black = (depth % 2 == 0) == is_black
    moves = get_candidate_moves(board, current_is_black)

    best_score = -1000
    best_move = moves[0] if moves else None

    for r, c in moves:
        board[r, c] = color
        neg_score = minimax(board, depth + 1, max_depth, -beta, -max(alpha, best_score),
                            -color, is_black, (r, c), table)
        if isinstance(neg_score, tuple):
            neg_score = neg_score[0]
        score = -neg_score
        board[r, c] = EMPTY

        if score > best_score:
            best_score = score
            best_move = (r, c)
            if best_score >= beta:
                break

    if len(table) < 200_000:
        table[key] = (max_depth - depth, best_score, best_move)

    return (best_score, best_move) if depth == 0 else best_score


def get_best_move(board, is_black, depth=4):
    """Return (row, col) for the best move."""
    color = BLACK if is_black else WHITE
    table = {}
    # Pass None as last_move: play_game already verified no one has won before
    # calling this, so there is no need for a terminal win check at the root.
    _, move = minimax(board, 0, depth, -1000, 1000, color, is_black, None, table)
    return move


def get_move_with_temperature(board, is_black, depth=4, temperature=1.0):
    """
    Return (label_move, played_move).

    label_move  — minimax best move; used as the policy training target.
    played_move — softmax-sampled from quick scores of all candidates.
                  temperature > 0 diversifies game trajectories while
                  still weighting moves by their heuristic quality.
                  temperature → 0 collapses to argmax (= deterministic minimax).
    """
    color = BLACK if is_black else WHITE

    # Policy label: minimax best move
    table = {}
    _, label_move = minimax(board, 0, depth, -1000, 1000, color, is_black, None, table)

    if temperature <= 0 or label_move is None:
        return label_move, label_move

    # Candidate scores for temperature sampling
    candidates = get_candidate_moves(board, is_black)
    if not candidates:
        return label_move, label_move

    scores = np.array([quick_score(board, r, c, color) for r, c in candidates],
                      dtype=np.float64)

    # Softmax with temperature
    scores = scores / temperature
    scores -= scores.max()          # numerical stability
    weights = np.exp(scores)
    weights /= weights.sum()

    idx = np.random.choice(len(candidates), p=weights)
    played_move = candidates[idx]

    return label_move, played_move


# ─── Tensor encoding for neural net ──────────────────────────────────────────

def board_to_tensor(board, is_black):
    """
    Convert board to (3, 15, 15) float32 array.
    Channel 0: current player stones
    Channel 1: opponent stones
    Channel 2: side indicator (1=Black to move, 0=White to move)
    """
    color = BLACK if is_black else WHITE
    opp   = -color
    tensor = np.zeros((3, BOARD_SIZE, BOARD_SIZE), dtype=np.float32)
    tensor[0] = (board == color).astype(np.float32)
    tensor[1] = (board == opp).astype(np.float32)
    tensor[2] = float(is_black)
    return tensor


def move_to_index(r, c):
    return r * BOARD_SIZE + c


def index_to_move(idx):
    return idx // BOARD_SIZE, idx % BOARD_SIZE


def play_game(black_depth=3, white_depth=3, max_moves=225, temperature=1.0):
    """
    Play one game between two minimax instances.

    Each move is sampled via softmax over quick-scores (temperature > 0),
    so every game follows a different trajectory even at the same depths.
    The *training label* for each position is still the minimax best move
    (not the sampled move), preserving label quality.

    temperature=0 falls back to pure deterministic minimax (argmax).
    """
    board = empty_board()
    records = []  # list of (tensor, label_move_index, is_black)

    # Black's first stone must be at the center — Renju rule
    cr, cc = BOARD_SIZE // 2, BOARD_SIZE // 2
    board[cr, cc] = BLACK
    records.append((board_to_tensor(board.copy(), True), move_to_index(cr, cc), True))

    is_black_turn = False  # White moves next
    move_num = 1

    while move_num < max_moves:
        color = BLACK if is_black_turn else WHITE
        depth = black_depth if is_black_turn else white_depth

        label_move, played_move = get_move_with_temperature(
            board, is_black_turn, depth, temperature
        )
        if played_move is None:
            break

        r, c = played_move
        board[r, c] = color

        # Record the board state with the minimax label (not necessarily played_move)
        tensor = board_to_tensor(board.copy(), is_black_turn)
        label_idx = move_to_index(*label_move) if label_move else move_to_index(r, c)
        records.append((tensor, label_idx, is_black_turn))

        if check_five(board, r, c, color):
            winner = color
            samples = []
            for t, mi, ib in records:
                player_color = BLACK if ib else WHITE
                outcome = 1.0 if player_color == winner else -1.0
                samples.append((t, mi, outcome))
            return samples, winner

        is_black_turn = not is_black_turn
        move_num += 1

    return [], 0  # draw (board full — should not happen in practice)
