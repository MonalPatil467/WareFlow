package com.example.OrderService.security;

public class TenantContext {

    private static final ThreadLocal<Long> COMPANY_ID =
            new ThreadLocal<>();

    private static final ThreadLocal<Long> USER_ID =
            new ThreadLocal<>();

    public static void setCompanyId(Long companyId) {
        COMPANY_ID.set(companyId);
    }

    public static Long getCompanyId() {
        return COMPANY_ID.get();
    }

    public static void setUserId(Long userId) {
        USER_ID.set(userId);
    }

    public static Long getUserId() {
        return USER_ID.get();
    }

    public static void clear() {
        COMPANY_ID.remove();
        USER_ID.remove();
    }
}