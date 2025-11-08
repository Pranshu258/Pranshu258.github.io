export const getTotalPages = (itemsLength, perPage) => {
    if (!Number.isFinite(perPage) || perPage <= 0) {
        return 0;
    }
    return Math.ceil(itemsLength / perPage);
};

export const getPageSlice = (items, currentPage, perPage) => {
    if (!Number.isFinite(perPage) || perPage <= 0) {
        return [];
    }

    const safePage = Math.max(currentPage, 1);
    const startIndex = (safePage - 1) * perPage;
    return items.slice(startIndex, startIndex + perPage);
};

export const getPageNumbers = (totalPages) => {
    if (!Number.isFinite(totalPages) || totalPages <= 0) {
        return [];
    }
    return Array.from({ length: totalPages }, (_, index) => index + 1);
};

export const createNextPageUpdater = (itemsLength, perPageKey, pageKey) => (prevState) => {
    const totalPages = getTotalPages(itemsLength, prevState[perPageKey]);
    if (totalPages === 0) {
        return null;
    }
    if (prevState[pageKey] < totalPages) {
        return { [pageKey]: prevState[pageKey] + 1 };
    }
    return null;
};

export const createPreviousPageUpdater = (pageKey) => (prevState) => {
    if (prevState[pageKey] > 1) {
        return { [pageKey]: prevState[pageKey] - 1 };
    }
    return null;
};
