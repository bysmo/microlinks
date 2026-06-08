package com.microlinks.operation.dto;

import lombok.Data;
import java.util.List;

@Data
public class PagedResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;

    public static <T> PagedResponse<T> of(List<T> content, int page, int size, long totalElements) {
        PagedResponse<T> r = new PagedResponse<>();
        r.setContent(content);
        r.setPage(page);
        r.setSize(size);
        r.setTotalElements(totalElements);
        r.setTotalPages((int) Math.ceil((double) totalElements / size));
        r.setFirst(page == 0);
        r.setLast(page >= r.getTotalPages() - 1);
        return r;
    }
}
