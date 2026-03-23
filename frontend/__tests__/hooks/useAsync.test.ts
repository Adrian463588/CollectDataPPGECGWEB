import { renderHook, act } from "@testing-library/react";
import { useAsync } from "@/hooks/useAsync";

describe("useAsync", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useAsync());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should update state on successful execution", async () => {
    const { result } = renderHook(() => useAsync());
    
    let promiseResult: string | undefined;
    await act(async () => {
      promiseResult = await result.current.run(Promise.resolve("success"));
    });

    expect(promiseResult).toBe("success");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle error state on failed execution", async () => {
    const { result } = renderHook(() => useAsync());

    await act(async () => {
      try {
        await result.current.run(Promise.reject(new Error("Test error")));
      } catch (e) {
        // expected
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Test error");
  });

  it("should use default error message if error is not an Error instance", async () => {
    const { result } = renderHook(() => useAsync());

    await act(async () => {
      try {
        await result.current.run(Promise.reject("Just a string error"), "Fallback error");
      } catch (e) {
        // expected
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Fallback error");
  });

  it("should clear error when clearError is called", async () => {
    const { result } = renderHook(() => useAsync());

    await act(async () => {
      try {
        await result.current.run(Promise.reject(new Error("Test error")));
      } catch (e) {}
    });

    expect(result.current.error).toBe("Test error");

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
