export const MENU_CONTENT_CLASS =
  "z-50 min-w-44 overflow-hidden rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

export const MENU_ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-[0.3125rem] text-xs outline-none transition-colors duration-100 focus:bg-state-hover focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_[data-icon]]:size-4 [&_[data-icon]]:shrink-0";

export const MENU_SUB_TRIGGER_CLASS = `${MENU_ITEM_CLASS} data-[state=open]:bg-state-active data-[state=open]:text-foreground`;

export const MENU_CHECKBOX_ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-md py-[0.3125rem] pl-2 pr-8 text-xs outline-none transition-colors duration-100 focus:bg-state-hover focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export const MENU_TRIGGER_BUTTON_CLASS =
  "relative m-0 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-subtle-foreground outline-none transition-colors duration-100 hover:bg-state-hover hover:text-foreground active:bg-state-active focus-visible:ring-2 focus-visible:ring-sidebar-ring max-md:pointer-coarse:h-9 max-md:pointer-coarse:w-9";

export const MENU_TRIGGER_ICON_CLASS = "size-3.5 max-md:pointer-coarse:size-5";
