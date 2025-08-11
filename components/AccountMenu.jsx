import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

const AccountMenu = forwardRef(function AccountMenu(
  {
    telegramUser,
    balances = {},
    selectedCrypto = "BTC",
    onOpenSettings = () => {},
    onOpenWallet = () => {},
    onLogout = () => {},
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [isBottomSheet, setIsBottomSheet] = useState(false);
  const rootRef = useRef(null);

  // Expose toggle() to parent
  useImperativeHandle(ref, () => ({
    toggle: () => setOpen((s) => !s),
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  useEffect(() => {
    const handleResize = () => {
      setIsBottomSheet(window.innerWidth <= 520);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close on outside click / Escape (with delay to prevent instant close)
  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    // Delay attaching to avoid catching the opening click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("touchstart", handleClick);
      document.addEventListener("keydown", handleKey);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const profileName = telegramUser
    ? `${telegramUser.first_name || ""} ${telegramUser.last_name || ""}`.trim()
    : "Account";

  const smallBalance = balances?.[selectedCrypto]?.balance || "—";
  const address = balances?.[selectedCrypto]?.address || "Unavailable";

  return (
    <div ref={rootRef} style={{ position: "relative", zIndex: 9999 }}>
      {/* Removed internal avatar trigger */}

      {open && (
        <div
          className={isBottomSheet ? "accountSheet" : "accountDropdown"}
          role="dialog"
          aria-label="Account menu"
        >
          {/* Menu: dropdown on wide screens, bottom sheet on small screens */}
          <div
            className={isBottomSheet ? "accountSheet" : "accountDropdown"}
            role="dialog"
            aria-label="Account menu"
          >
            <div className="menuHeader">
              <div className="menuAvatar">
                <img
                  src={telegramUser?.photo_url || "/assets/default-avatar.png"}
                  alt={profileName}
                />
              </div>
              <div className="menuHeaderText">
                <div className="name">{profileName}</div>
                {telegramUser?.username && (
                  <div className="handle">@{telegramUser.username}</div>
                )}
              </div>
            </div>

            <div className="menuBody">
              <button
                className="menuItem"
                onClick={() => {
                  onOpenWallet();
                  setOpen(false);
                }}
              >
                <div>
                  <div className="miLabel">Wallet</div>
                  <div className="miSub">
                    {selectedCrypto} • {smallBalance}
                  </div>
                </div>
              </button>

              <button
                className="menuItem"
                onClick={() => {
                  onOpenSettings();
                  setOpen(false);
                }}
              >
                <div>
                  <div className="miLabel">Settings</div>
                  <div className="miSub">Security, preferences</div>
                </div>
              </button>

              <button
                className="menuItem"
                onClick={() => {
                  navigator.clipboard?.writeText(address).catch(() => {});
                  setOpen(false);
                }}
              >
                <div>
                  <div className="miLabel">Copy {selectedCrypto} address</div>
                  <div className="miSub">
                    {address.slice ? `${address.slice(0, 12)}...` : address}
                  </div>
                </div>
              </button>

              <div className="divider" />

              <button
                className="menuItemDestructive"
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
              >
                Logout
              </button>

              <button
                className="menuClose"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keep your styles here */}
      {/* Lightweight styles (you can move to your CSS module). */}
      <style jsx>{`
        .accountDropdown {
          position: absolute;
          left: 0px;
          top: 0px;
          width: 320px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(16, 37, 73, 0.12);
          border: 1px solid rgba(16, 37, 73, 0.06);
        }

        .accountSheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ffffff;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          box-shadow: 0 -8px 30px rgba(16, 37, 73, 0.12);
          border: 1px solid rgba(16, 37, 73, 0.06);
          padding-bottom: env(safe-area-inset-bottom);
        }

        .menuHeader {
          display: flex;
          gap: 12px;
          padding: 16px;
          align-items: center;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }

        .menuAvatar img {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(16, 37, 73, 0.06);
        }

        .menuHeaderText .name {
          font-weight: 700;
          color: #10203a;
        }
        .menuHeaderText .handle {
          font-size: 12px;
          color: #6b7a8a;
        }

        .menuBody {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .menuItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 12px;
          background: #f8fbff;
          border-radius: 10px;
          border: 1px solid rgba(16, 37, 73, 0.04);
          text-align: left;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .menuItem:active {
          transform: translateY(1px);
        }

        .miLabel {
          font-weight: 700;
          color: #12325a;
        }
        .miSub {
          font-size: 12px;
          color: #6b7a8a;
          margin-top: 4px;
        }

        .divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.04);
          margin: 8px 0;
          border-radius: 2px;
        }

        .menuItemDestructive {
          padding: 12px;
          background: #fff6f6;
          border-radius: 10px;
          color: #a12a2a;
          border: 1px solid rgba(161, 42, 42, 0.06);
          font-weight: 700;
        }

        .menuClose {
          margin-top: 8px;
          background: none;
          border: none;
          padding: 10px;
          color: #6b7a8a;
          cursor: pointer;
          text-decoration: underline;
        }
        

        /* Small adjustments so dropdown doesn't overflow on very small screens */
        @media (max-width: 520px) {
          .accountDropdown {
            right: 8px;
            left: 8px;
            width: auto;
            top: 64px;
          }
        }
      `}</style>
    </div>
  );
});

export default AccountMenu;
