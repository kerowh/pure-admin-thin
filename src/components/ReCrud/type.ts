import type {
  ActionBarButtonsRow,
  PlusSearchSelfProps,
  PlusPageProps,
  PlusFormProps,
  CommonType,
  TableColumnProps,
  FormColumnProps
} from "plus-pro-components";

type PlusPageRemoveProps =
  | "request"
  | "search"
  | "pagination" //TODO: 待优化
  | "params"
  | "columns";

export type CrudAction = "add" | "edit" | "delete" | "view" | "batchDelete";

type BaseCrudActionConfig<T extends CrudAction> = {
  type: T;
  text?: string;
  request?: (data: any) => Promise<any>;
  disabled?: (data?: Record<string, any>) => boolean;
  btnClick?: (data?: Record<string, any> | Record<string, any>[]) => void;
  beforeRequest?: (
    done: (data?: any) => void,
    form: Record<string, any>,
    type: "add" | "edit" | "delete" | "batchDelete" | "view"
  ) => void;
} & (T extends "add" | "edit"
  ? {
      // 当 type 为 add/edit 时
      beforeOpen?: (
        done: (data?: Record<string, any>) => void,
        form: Record<string, any>,
        type: "add" | "edit"
      ) => void;
    }
  : {
      beforeOpen?: never;
    });

// "view" 类型配置
export type ViewActionConfig = BaseCrudActionConfig<"view">;

// "add" | "edit" | "delete" | "batchDelete" 类型配置
export type MutateActionConfig = BaseCrudActionConfig<
  "add" | "edit" | "delete" | "batchDelete"
> & {
  afterAction?: (
    done: () => void,
    form: Record<string, any>,
    type: "add" | "edit" | "delete" | "batchDelete"
  ) => void;
};

export type CrudActionsConfig = ViewActionConfig | MutateActionConfig;

export type CrudColumn = FormColumnProps &
  CommonType &
  TableColumnProps & {
    searchValidate?: boolean;
  } & (
    | {
        renderHeader: CommonType["renderHeader"];
        filterable?: never;
        filterList?: never;
        children?: CrudColumn[];
      }
    | {
        renderHeader?: never;
        filterable: true;
        filterList:
          | FilterListOption[]
          | ((...args: any) => Promise<FilterListOption[]>);
        children?: never;
      }
    | {
        renderHeader?: CommonType["renderHeader"];
        filterable?: false;
        filterList?: never;
        children?: CrudColumn[];
      }
    | {
        renderHeader?: CommonType["renderHeader"];
        filterable?: never;
        filterList?: never;
        children: CrudColumn[];
      }
  );

export type ModelValues = {
  ///双向绑定当前选中的单行数据
  currentRow?: Record<string, any>;
  //双向绑定当前选中的多行数据
  selectedRows?: Record<string, any>[];
  //双向绑定当前搜索参数
  searchParams?: Record<string, any>;
};

export type MoreActionBarBtns = (ActionBarButtonsRow & {
  permissionKey?: string;
})[];

export type CrudProps = {
  columns: CrudColumn[];
  pageRequest: PlusPageProps["request"];
  showSearch?: boolean;
  searchConfig?: {
    showNumber?: number;
    colProps?: PlusSearchSelfProps["colProps"];
    rowProps?: PlusSearchSelfProps["rowProps"];
    searchText?: string;
    resetText?: string;
    retractText?: string;
    expandText?: string;
    labelPosition?: "left" | "right" | "top";
    labelWidth?: PlusFormProps["labelWidth"];
  };
  formConfig?: {
    labelWidth?: PlusFormProps["labelWidth"];
    labelPosition?: PlusFormProps["labelPosition"];
    rowProps?: PlusFormProps["rowProps"];
    colProps?: PlusFormProps["colProps"];
    defaultValues?: Record<string, any>;
  };
  fixedSeachParams?: Record<string, any>;
  //导出配置
  exportConfig?: {
    exportUrl: string;
    fileName?: string;
  };
  //导入配置
  importConfig?: {
    action: string;
    templateUrl: string;
    fileTypes?: string[];
    maxFileSize?: number;
    data?: Record<string, any>;
    onSuccess?: (data: any) => void;
  };
  //显示的crud按钮 默认为空数组 显示按钮的条件是此属性包含的按钮且有权限
  crudConfigs?: CrudActionsConfig[];
  // 业务模块名称 用于区分不同业务模块的按钮权限
  permissionModule?: string;
  moreActionBarBtns?: MoreActionBarBtns;
  formDialogConfig?: {
    confirmText?: string;
    cancelText?: string;
    footerAlign?: "left" | "right" | "center";
    top?: string;
    width?: string;
  };
  viewDialogConfig?: {
    width?: string;
    top?: string;
  };
  viewConfig?: {
    labelWidth?: string;
  };
} & Omit<PlusPageProps, PlusPageRemoveProps> &
  ModelValues;

export type FilterListOption = {
  label: string;
  value: string | number;
};
