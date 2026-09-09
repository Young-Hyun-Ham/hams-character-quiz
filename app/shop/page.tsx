"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  balance,
  cancelPurchase,
  completePurchase,
  purchaseProduct,
  purchases,
  refreshStore,
} from "../stickers/storage";
import { SHOP_PRODUCTS } from "./products";
import "./shop.css";
import "./shop-sprite.css";
import "./shop-actions.css";
import "./shop-quantity.css";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("stickers-changed", callback);
  window.addEventListener("shop-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("stickers-changed", callback);
    window.removeEventListener("shop-changed", callback);
  };
}
function snapshot() {
  try {
    return JSON.stringify({ balance: balance(), purchases: purchases() });
  } catch {
    return "error";
  }
}

export default function ShopPage() {
  const saved = useSyncExternalStore(subscribe, snapshot, () => "");
  const data =
    saved && saved !== "error"
      ? (JSON.parse(saved) as {
          balance: number;
          purchases: ReturnType<typeof purchases>;
        })
      : { balance: 0, purchases: [] };
  const [mode, setMode] = useState<"child" | "parent">("child");
  const [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void refreshStore().catch(() => setMessage("스티커 정보를 불러오지 못했어요."));
  }, []);

  async function addProduct(product: (typeof SHOP_PRODUCTS)[number]) {
    try {
      await purchaseProduct(product.id, product.name, product.price, quantity);
      setMessage(
        `${product.name} ${quantity}개를 담았어요! 부모님께 보여 주세요.`,
      );
      setSelected(null);
      setQuantity(1);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "상품을 담지 못했어요.",
      );
    }
  }

  return (
    <main className="shop-shell">
      <header className="shop-header">
        <Link href="/">← 놀이로 돌아가기</Link>
        <strong>⭐ 스티커 상점</strong>
        <span>
          보유 <b>{data.balance}</b>개
        </span>
      </header>
      <section className="shop-panel">
        <div className="shop-heading">
          <div>
            <small>HAMS REWARD SHOP</small>
            <h1>
              {mode === "child" ? "무엇을 사고 싶나요?" : "구매한 상품 확인"}
            </h1>
          </div>
          <div className="shop-mode" role="group" aria-label="상점 모드">
            <button
              type="button"
              aria-pressed={mode === "child"}
              onClick={() => {
                setMode("child");
                setMessage("");
              }}
            >
              자녀
            </button>
            <button
              type="button"
              aria-pressed={mode === "parent"}
              onClick={() => {
                setMode("parent");
                setMessage("");
              }}
            >
              부모
            </button>
          </div>
        </div>
        {message && (
          <p className="shop-message" role="status">
            {message}
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="알림 닫기"
            >
              ×
            </button>
          </p>
        )}
        {mode === "child" ? (
          <div className="product-grid">
            {SHOP_PRODUCTS.map((product, index) => {
              const maximum = Math.floor(data.balance / product.price);
              return (
                <article className="product-card" key={product.id}>
                  <button
                    type="button"
                    className="product-select"
                    onClick={() => {
                      setSelected(product.id);
                      setQuantity(1);
                    }}
                    aria-label={`${product.name}, 스티커 ${product.price}개`}
                  >
                    <span
                      className="product-image"
                      role="img"
                      aria-label={product.name}
                      style={
                        {
                          "--column": index % 4,
                          "--row": Math.floor(index / 4),
                        } as CSSProperties
                      }
                    />
                    <strong>{product.name}</strong>
                    <span className="product-price">⭐ {product.price}개</span>
                  </button>
                  {selected === product.id && (
                    <div className="product-overlay">
                      <div className="product-overlay-shade" />
                      <div className="product-quantity">
                        <label htmlFor={`quantity-${product.id}`}>수량</label>
                        <input
                          id={`quantity-${product.id}`}
                          type="number"
                          min="0"
                          max={Math.max(0, maximum)}
                          value={quantity}
                          onKeyDown={(event) => {
                            if (quantity === 0 && /^\d$/.test(event.key)) {
                              event.preventDefault();
                              setQuantity(Math.min(maximum, Number(event.key)));
                            }
                          }}
                          onChange={(event) => {
                            const input = event.target.value;
                            const next =
                              input === ""
                                ? 0
                                : Math.max(
                                    0,
                                    Math.min(
                                      maximum,
                                      Number.parseInt(input, 10) || 0,
                                    ),
                                  );
                            event.currentTarget.value = String(next);
                            setQuantity(next);
                          }}
                        />
                        <button
                          type="button"
                          disabled={maximum < 1}
                          onClick={() => setQuantity(maximum)}
                        >
                          전부
                        </button>
                      </div>
                      <strong className="product-total">
                        {product.id === "cash"
                          ? `${quantity * 10}원`
                          : `⭐ ${product.price * quantity}개`}
                      </strong>
                      <div className="product-overlay-actions">
                        <button
                          type="button"
                          disabled={
                            quantity < 1 || maximum < 1 || quantity > maximum
                          }
                          onClick={() => void addProduct(product)}
                        >
                          상품담기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(null);
                            setQuantity(1);
                          }}
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <PurchaseList
            items={data.purchases}
            onComplete={async (id) => {
              await completePurchase(id);
              setMessage("상품 전달을 완료했어요.");
            }}
            onCancel={async (id) => {
              await cancelPurchase(id);
              setMessage("구매를 취소하고 스티커를 환불했어요.");
            }}
          />
        )}
      </section>
    </main>
  );
}

function PurchaseList({
  items,
  onComplete,
  onCancel,
}: {
  items: ReturnType<typeof purchases>;
  onComplete: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const pending = [...items]
    .filter((item) => !item.completedAt && !item.canceledAt)
    .reverse();
  const completed = [...items].filter((item) => item.completedAt).reverse();
  if (!items.length)
    return <div className="shop-empty">아직 구매한 상품이 없어요.</div>;
  return (
    <div className="purchase-lists">
      <section>
        <h2>
          전달 대기 <b>{pending.length}</b>
        </h2>
        {pending.length ? (
          pending.map((item) => (
            <article className="purchase-row" key={item.id}>
              <div>
                <strong>
                  {item.name} × {item.quantity ?? 1}
                  {item.productId === "cash" ? ` (${item.cost * 10}원)` : ""}
                </strong>
                <span>
                  ⭐ {item.cost}개 ·{" "}
                  {new Date(item.purchasedAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <span className="purchase-actions">
                <button type="button" onClick={() => void onComplete(item.id)}>
                  완료
                </button>
                <button
                  type="button"
                  className="purchase-cancel"
                  onClick={() => void onCancel(item.id)}
                >
                  취소
                </button>
              </span>
            </article>
          ))
        ) : (
          <p>기다리는 상품이 없어요.</p>
        )}
      </section>
      {completed.length > 0 && (
        <section className="completed-list">
          <h2>완료한 상품</h2>
          {completed.map((item) => (
            <article className="purchase-row" key={item.id}>
              <div>
                <strong>
                  {item.name} × {item.quantity ?? 1}
                  {item.productId === "cash" ? ` (${item.cost * 10}원)` : ""}
                </strong>
                <span>⭐ {item.cost}개</span>
              </div>
              <em>전달 완료</em>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
