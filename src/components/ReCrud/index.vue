<script setup lang="ts">
import {
  PlusDisplayItem,
  PlusDialog,
  PlusPage,
  PlusDialogForm
} from "plus-pro-components";
import type {
  ActionBarButtonsRow,
  ButtonsCallBackParams,
  PlusPageInstance,
  PlusDialogFormInstance
} from "plus-pro-components";
import type { FormRules } from "element-plus";
import { message } from "@/utils/message";
import type {
  CrudActionsConfig,
  CrudAction,
  FilterListOption,
  CrudProps,
  ModelValues,
  MutateActionConfig,
  ViewActionConfig
} from "./type.ts";
import { hasPerms } from "@/utils/auth";
import { useTable } from "plus-pro-components";
import {
  ref,
  useAttrs,
  reactive,
  watchEffect,
  toRefs,
  computed,
  nextTick
} from "vue";
import type { Ref } from "vue";
import {
  Plus,
  Delete,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  RefreshRight,
  Search,
  WarningFilled
} from "@element-plus/icons-vue";
import { isObjEquivalent } from "@/utils/is";
import { IconifyIconOnline } from "@/components/ReIcon/index";
import ReImport from "@/components/ReImport";

const props = withDefaults(defineProps<CrudProps>(), {
  immediate: true,
  showSearch: true,
  batchDelete: false,
  importOpt: false,
  exportOpt: false,
  fixedSeachParams: () => ({}),
  moreActionBarBtns: () => [],
  currentRow: () => ({}),
  selectedRows: () => [],
  searchParams: () => ({}),
  crudConfigs: () => []
});

const emits = defineEmits<{
  (e: "update:currentRow", value: Record<string, any>): void;
  (e: "update:selectedRows", value: Record<string, any>[]): void;
  (e: "update:searchParams", value: Record<string, any>): void;
  (e: "rowClick", value: Record<string, any>): void;
}>();

const modelValues = reactive<ModelValues>({
  currentRow: {},
  selectedRows: [],
  searchParams: {}
});
const { currentRow, selectedRows, searchParams } = toRefs(modelValues);
const { buttons } = useTable();
const plusPageInstanceRef = ref<PlusPageInstance>();
const plusDialogFormInstanceRef = ref<PlusDialogFormInstance>();
const searchParamsLast = ref<Record<string, any>>();

//类型重载
function getCrudConfig(
  type: "add" | "edit" | "delete" | "batchDelete"
): MutateActionConfig;
function getCrudConfig(type: "view"): ViewActionConfig;
function getCrudConfig(type: CrudAction): CrudActionsConfig;

//根据CRUD 类型获取 CRUD操作配置
function getCrudConfig(type: CrudAction): CrudActionsConfig {
  const crudTextMap = {
    add: "新建",
    edit: "编辑",
    delete: "删除",
    batchDelete: "批量删除",
    view: "查看"
  };
  const configItem = props.crudConfigs?.find(item => item.type === type);

  if (!configItem) return null;
  const resultConfig = {
    text: crudTextMap[type],
    disabled: () => false,
    ...configItem
  };
  return type === "view"
    ? (resultConfig as ViewActionConfig)
    : (resultConfig as MutateActionConfig);
}

const crudActionBarBtns = ref<
  Record<string, Omit<ActionBarButtonsRow, "icon">>
>({
  view: {
    text: getCrudConfig("view")?.text,
    props: row => {
      return {
        type: "primary",
        disabled: getCrudConfig("view").disabled(row)
      };
    }
  },
  edit: {
    text: getCrudConfig("edit")?.text,
    props: row => {
      return {
        type: "primary",
        disabled: getCrudConfig("edit").disabled(row)
      };
    }
  },
  delete: {
    text: getCrudConfig("delete")?.text,
    props: row => {
      return {
        type: "danger",
        disabled: getCrudConfig("delete").disabled(row)
      };
    }
  }
});
const pageData = ref<any[]>([]);
const pageDataAll = ref<any[]>([]);
const filterablePropFilterListMap = ref<{
  [key: string]: {
    filterList: FilterListOption[];
    filterListRequest?: (...args: any) => Promise<FilterListOption[]>;
    selected: FilterListOption["value"][];
    selectedStash: FilterListOption["value"][];
  };
}>({});
const filterPopperRefList = ref([]);

const dialogVisible = ref<boolean>(false);
const detailVisible = ref<boolean>(false);
const deleteVisible = ref<boolean>(false);
const importVisible = ref<boolean>(false);
const form = ref<Record<string, any>>({});
const isAdd = ref<boolean>(false);
const confirmLoading = ref<boolean>(false);
const isBatchDelete = ref<boolean>(false);
// 显示的CRUD按钮类型
const crudAction = computed<CrudAction[]>(() => {
  return props.crudConfigs.map(item => {
    return item.type;
  });
});
//去除columns内的colProps/rules属性与过滤formRules属性
const columns = computed(() => {
  return props.columns.map(item => {
    const { colProps: formColProps, rules: formRules, ...rest } = item;
    return { ...rest, formColProps, formRules };
  });
});
//表单校验
const rules = computed<FormRules>(() => {
  return columns.value.reduce((prev, next) => {
    if (next.formRules) {
      prev[next.prop] = next.formRules;
    }
    return prev;
  }, {});
});

//搜索表单校验
const searchRules = computed<FormRules>(() => {
  return columns.value.reduce((prev, next) => {
    if (next.searchValidate) {
      prev[next.prop] = next.formRules ?? [];
    }
    return prev;
  }, {});
});

const searchFieldNumber = computed<number>(() => {
  return columns.value.reduce((prev, next) => {
    if (!next.hideInSearch) {
      prev++;
    }
    return prev;
  }, 0);
});

//点击操作栏按钮时
const handleTableOption = ({ row, buttonRow }: ButtonsCallBackParams) => {
  switch (buttonRow.code) {
    case "edit":
      handleEdit(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    case "view":
      handleView(row);
      break;
  }
};

//新增
const handleAdd = () => {
  if (getCrudConfig("add")?.btnClick) {
    return getCrudConfig("add")?.btnClick();
  }
  nextTick(() => {
    isAdd.value = true;
    plusDialogFormInstanceRef.value?.formInstance?.resetFields();
    form.value = { ...(props.formConfig?.defaultValues ?? {}) };
    if (getCrudConfig("add")?.beforeOpen) {
      return getCrudConfig("add")?.beforeOpen(
        (data?: Record<string, any>) => {
          form.value = { ...form.value, ...(data ?? {}) };
          dialogVisible.value = true;
        },
        form.value,
        "add"
      );
    }
    dialogVisible.value = true;
  });
};

//编辑
const handleEdit = (row: Record<string, any>) => {
  if (getCrudConfig("edit")?.btnClick) {
    return getCrudConfig("edit")?.btnClick(row);
  }
  nextTick(() => {
    isAdd.value = false;
    plusDialogFormInstanceRef.value?.formInstance?.resetFields();
    form.value = { ...row };
    if (getCrudConfig("edit")?.beforeOpen) {
      return getCrudConfig("edit")?.beforeOpen(
        (data?: Record<string, any>) => {
          form.value = { ...form.value, ...(data ?? {}) };
          dialogVisible.value = true;
        },
        form.value,
        "edit"
      );
    }
    dialogVisible.value = true;
  });
};
//新增编辑提交
const handleFormSubmit = () => {
  const submit = async (
    type: "add" | "edit",
    data: Record<string, any> = {}
  ) => {
    confirmLoading.value = true;
    form.value = { ...form.value, ...data };
    try {
      await getCrudConfig(type).request(form.value);
      if (getCrudConfig(type)?.afterAction) {
        return getCrudConfig(type)?.afterAction(
          () => getSuccessAction(type),
          form.value,
          type
        );
      }
      getSuccessAction(type);
    } catch (error) {
      confirmLoading.value = false;
    }
  };

  if (isAdd.value) {
    if (getCrudConfig("add")?.beforeRequest) {
      return getCrudConfig("add")?.beforeRequest(
        (data?: Record<string, any>) => submit("add", data),
        form.value,
        "add"
      );
    }
    submit("add", form.value);
  } else {
    if (getCrudConfig("edit")?.beforeRequest) {
      return getCrudConfig("edit")?.beforeRequest(
        (data?: Record<string, any>) => submit("edit", data),
        form.value,
        "edit"
      );
    }
    submit("edit", form.value);
  }
};
//删除
const handleDelete = (row: Record<string, any>) => {
  if (getCrudConfig("delete")?.btnClick) {
    return getCrudConfig("delete")?.btnClick(row);
  }
  form.value = { ...row };
  isBatchDelete.value = false;
  deleteVisible.value = true;
};
//确认删除 单条
const confirmDelete = () => {
  const submit = async (data?: any) => {
    confirmLoading.value = true;
    try {
      await getCrudConfig("delete").request(data ?? form.value);
      if (getCrudConfig("delete")?.afterAction) {
        return getCrudConfig("delete")?.afterAction(
          () => getSuccessAction("delete"),
          form.value,
          "delete"
        );
      }
      getSuccessAction("delete");
    } catch (error) {
      confirmLoading.value = false;
    }
  };
  if (getCrudConfig("delete")?.beforeRequest) {
    return getCrudConfig("delete")?.beforeRequest(
      (data?: any) => {
        submit(data);
      },
      form.value,
      "delete"
    );
  }
  submit();
};
//查看
const handleView = (row: Record<string, any>) => {
  if (getCrudConfig("view")?.btnClick) {
    return getCrudConfig("view")?.btnClick(row);
  }
  let submitData = { ...row };
  const submit = async () => {
    const { data } = await getCrudConfig("view").request(submitData);
    form.value = { ...form.value, ...(data ?? {}) };
    detailVisible.value = true;
  };
  nextTick(() => {
    form.value = { ...row };
    if (getCrudConfig("view")?.beforeRequest) {
      return getCrudConfig("view")?.beforeRequest(
        (data?: any) => {
          submitData = data ?? { ...row };
          submit();
        },
        form.value,
        "view"
      );
    }
    submit();
  });
};
//批量删除
const handleBatchDelete = () => {
  if (getCrudConfig("batchDelete")?.btnClick) {
    return getCrudConfig("batchDelete")?.btnClick(selectedRows.value);
  }
  isBatchDelete.value = true;
  deleteVisible.value = true;
};
//确认删除 批量
const confirmBatchDelete = () => {
  const submit = async (data?: any) => {
    confirmLoading.value = true;
    try {
      await getCrudConfig("batchDelete").request(data ?? selectedRows.value);
      if (getCrudConfig("batchDelete")?.afterAction) {
        return getCrudConfig("batchDelete")?.afterAction(
          () => getSuccessAction("delete"),
          selectedRows.value,
          "batchDelete"
        );
      }
      getSuccessAction("batchDelete");
    } catch (error) {
      confirmLoading.value = false;
    }
  };
  if (getCrudConfig("batchDelete")?.beforeRequest) {
    return getCrudConfig("batchDelete")?.beforeRequest(
      (data: any) => {
        submit(data);
      },
      selectedRows.value,
      "batchDelete"
    );
  }
  submit();
};

const getSuccessAction = (type: "add" | "edit" | "delete" | "batchDelete") => {
  const crudActonDialogVisibleMap: Record<
    "add" | "edit" | "delete" | "batchDelete",
    Ref<boolean>
  > = {
    add: dialogVisible,
    edit: dialogVisible,
    delete: deleteVisible,
    batchDelete: deleteVisible
  };
  confirmLoading.value = false;

  message(`${getCrudConfig(type).text}操作成功`, { type: "success" });
  crudActonDialogVisibleMap[type].value = false;
  plusPageInstanceRef.value?.getList();
  form.value = {};
};

const handleImport = () => {
  importVisible.value = true;
};

const handleImportSuccess = (res: any) => {
  props.importConfig?.onSuccess?.(res);
};

const rowClick = (row: Record<string, any>) => {
  currentRow.value = { ...row };
  emits("rowClick", { ...currentRow.value });
};

const selectedChange = (selected: Record<string, any>[]) => {
  selectedRows.value = [...selected];
  emits("update:selectedRows", [...selectedRows.value]);
};

const setPopperRefList = (el, index: number) => {
  filterPopperRefList.value[index] = el;
};
//获取可筛选列对应筛选值选择列表
const getFilterList = () => {
  for (const prop in filterablePropFilterListMap.value) {
    const { filterListRequest } = filterablePropFilterListMap.value[prop];
    if (filterListRequest) {
      filterListRequest({
        ...props.fixedSeachParams,
        ...searchParams.value
      }).then(data => {
        filterablePropFilterListMap.value[prop].filterList = data;
      });
    }
  }
};

const handleFilterProp = (prop: string, index: number) => {
  const { selectedStash } = filterablePropFilterListMap.value[prop];
  filterablePropFilterListMap.value[prop].selected = [...selectedStash];
  nextTick(() => {
    plusPageInstanceRef.value?.getList();
    filterPopperRefList.value[index].hide();
  });
};

const handleResetFilterProp = (prop: string, index: number) => {
  filterablePropFilterListMap.value[prop].selected = [];
  filterablePropFilterListMap.value[prop].selectedStash = [];
  nextTick(() => {
    plusPageInstanceRef.value?.getList();
    filterPopperRefList.value[index].hide();
  });
};

//表格请求完成后
const handleTableRequestComplete = (data: any[]) => {
  pageData.value = data;
  pageDataAll.value = data;
  //如果主要搜索条件没有改变 则无需重新获取筛选值选择列表
  if (!isObjEquivalent(searchParamsLast.value, searchParams.value)) {
    getFilterList();
    searchParamsLast.value = { ...searchParams.value };
  }
};

const conductSearch = (done: () => void) => {
  plusPageInstanceRef.value?.plusSearchInstance?.plusFormInstance?.formInstance.validate(
    (valid: boolean) => {
      if (valid) {
        for (const prop in filterablePropFilterListMap.value) {
          filterablePropFilterListMap.value[prop].selectedStash = [];
          filterablePropFilterListMap.value[prop].selected = [];
        }
        nextTick(() => {
          done();
        });
      }
    }
  );
};

const handleSearch = (done: () => void) => {
  searchParams.value = {
    ...searchParams.value,
    ...(plusPageInstanceRef.value?.getSearchFieldsValue() as Record<
      string,
      any
    >)
  };
  plusPageInstanceRef.value?.setSearchFieldsValue(searchParams.value);
  nextTick(() => {
    conductSearch(done);
  });
};

const handleReset = (done: () => void) => {
  searchParams.value = {};
  plusPageInstanceRef.value?.setSearchFieldsValue(searchParams.value);
  nextTick(() => {
    conductSearch(done);
  });
};

watchEffect(() => {
  filterablePropFilterListMap.value = props.columns.reduce((prev, next) => {
    if (next.filterable) {
      prev[next.prop] = {
        filterList: Array.isArray(next.filterList) ? next.filterList : [],
        filterListRequest: Array.isArray(next.filterList)
          ? undefined
          : next.filterList,
        selected: [],
        selectedStash: []
      };
    }
    return prev;
  }, {});
});

watchEffect(() => {
  currentRow.value = { ...props.currentRow };
  selectedRows.value = [...props.selectedRows];
  searchParams.value = { ...props.searchParams };
});

watchEffect(() => {
  buttons.value = [
    ...Object.keys(crudActionBarBtns.value)
      .filter(
        key =>
          crudAction.value.includes(key as CrudAction) &&
          hasPerms(`${props.permissionModule}:btn:${key}`)
      )
      .map(key => {
        return {
          ...crudActionBarBtns.value[key],
          code: key
        };
      }),
    ...props.moreActionBarBtns
      .filter(item =>
        hasPerms(`${props.permissionModule}:btn:${item.permissionKey}`)
      )
      .map(item => {
        const { permissionKey, ...rest } = item;
        return rest;
      })
  ];
});
</script>

<template>
  <div class="h-full">
    <PlusPage
      ref="plusPageInstanceRef"
      v-bind="useAttrs()"
      :request="props.pageRequest"
      :columns="columns"
      :page-info-map="{ page: 'pageNum' }"
      :search="{
        showNumber: 4,
        colProps: {
          span: 6
        },
        ...props.searchConfig,
        rules: searchRules,
        defaultValues: searchParams,
        'onUpdate:modelValue': (params: Record<string, any>) => {
          searchParams.value = params;
          emits('update:searchParams', params);
        }
      }"
      :params="{
        ...props.fixedSeachParams,
        ...Object.keys(filterablePropFilterListMap).reduce((prev, next) => {
          prev[next] = filterablePropFilterListMap[next].selected;
          return prev;
        }, {})
      }"
      :table="{
        ...props.table,
        adaptive: true,
        ...(buttons.length > 0
          ? {
              actionBar: {
                fixed: 'right',
                ...(props.table?.actionBar ?? {}),
                buttons,
                width: 150
              }
            }
          : {}),
        isSelection:
          crudAction.includes('batchDelete') || props.table?.isSelection,
        onClickAction: handleTableOption,
        onSelectionChange: selectedChange,
        onRowClick: rowClick
      }"
      @requestComplete="handleTableRequestComplete"
    >
      <template #table-title>
        <div class="flex">
          <el-button
            v-if="
              crudAction.includes('add') &&
              hasPerms(`${props.permissionModule}:btn:add`)
            "
            type="default"
            :icon="Plus"
            :disabled="getCrudConfig('add').disabled(selectedRows)"
            @click="handleAdd"
            >{{ getCrudConfig("add").text }}
          </el-button>
          <el-button
            v-if="
              crudAction.includes('batchDelete') &&
              hasPerms(`${props.permissionModule}:btn:delete`)
            "
            type="danger"
            :icon="Delete"
            plain
            :disabled="
              !selectedRows.length ||
              getCrudConfig('batchDelete')?.disabled?.(selectedRows)
            "
            @click="handleBatchDelete"
            >{{ getCrudConfig("batchDelete").text }}
          </el-button>
          <el-button
            v-if="
              props.importConfig &&
              hasPerms(`${props.permissionModule}:btn:import`)
            "
            plain
            type="default"
            :icon="Upload"
            @click="handleImport"
            >批量导入
          </el-button>
          <el-button
            v-if="
              props.exportConfig &&
              hasPerms(`${props.permissionModule}:btn:export`)
            "
            type="default"
            :icon="Download"
            >导出
          </el-button>
          <slot name="tableTitle" />
        </div>
      </template>
      <template
        v-for="(prop, index) in Object.keys(filterablePropFilterListMap)"
        #[`plus-header-${prop}`]="{ column }"
        :key="prop"
      >
        <div class="flex items-center">
          <el-tooltip
            effect="dark"
            :content="`
                 当前字段已开启筛选值:
                 ${
                   filterablePropFilterListMap[prop].filterList
                     .filter(item => {
                       return filterablePropFilterListMap[
                         prop
                       ].selected.includes(item.value);
                     })
                     .map(item => item.label)
                     .join(', ') || '无'
                 }
               `"
            placement="top"
          >
            <span
              class="cursor-pointer"
              :class="{
                'text-primary':
                  filterablePropFilterListMap[prop].selected.length > 0
              }"
              >{{ column.label }}
            </span>
          </el-tooltip>
          <el-popover
            :ref="el => setPopperRefList(el, index)"
            trigger="click"
            :popper-style="{ width: 'auto', maxWidth: '300px' }"
          >
            <template #reference>
              <IconifyIconOnline
                icon="ant-design:filter-outlined"
                class="cursor-pointer text-base"
                :class="{
                  'text-primary':
                    filterablePropFilterListMap[prop].selected.length > 0,
                  'filter-icon':
                    !filterablePropFilterListMap[prop].selected.length
                }"
              />
            </template>
            <template #default>
              <div class="flex prop-filter-header">
                <el-button
                  text
                  type="primary"
                  :disabled="
                    filterablePropFilterListMap[prop].selectedStash.length ===
                      0 ||
                    (filterablePropFilterListMap[prop].selectedStash.every(
                      val =>
                        filterablePropFilterListMap[prop].selected.includes(val)
                    ) &&
                      filterablePropFilterListMap[prop].selected.length ===
                        filterablePropFilterListMap[prop].selectedStash.length)
                  "
                  @click="handleFilterProp(prop, index)"
                  >开启筛选
                </el-button>
                <el-button
                  text
                  type="warning"
                  :disabled="
                    filterablePropFilterListMap[prop].selected.length === 0
                  "
                  @click="handleResetFilterProp(prop, index)"
                  >重置筛选
                </el-button>
              </div>
              <div class="prop-filter-body">
                <el-checkbox-group
                  v-model="filterablePropFilterListMap[prop].selectedStash"
                >
                  <div
                    v-for="item in filterablePropFilterListMap[prop].filterList"
                    :key="item.value"
                  >
                    <el-checkbox :value="item.value" :label="item.value"
                      >{{ item.label }}
                    </el-checkbox>
                  </div>
                </el-checkbox-group>
              </div>
            </template>
          </el-popover>
        </div>
      </template>
      <template
        #search-footer="{
          handleReset: resetDone,
          handleSearch: searchDone,
          handleUnfold,
          isShowUnfold
        }"
      >
        <div class="flex">
          <el-button :icon="RefreshRight" @click="handleReset(resetDone)"
            >{{ props.searchConfig?.resetText ?? "重置" }}
          </el-button>
          <el-button
            type="primary"
            :icon="Search"
            @click="handleSearch(searchDone)"
            >{{ props.searchConfig?.searchText ?? "查询" }}
          </el-button>
          <el-button
            v-if="(props.searchConfig?.showNumber ?? 4) < searchFieldNumber"
            :icon="isShowUnfold ? ArrowUp : ArrowDown"
            @click="handleUnfold"
          >
            {{
              isShowUnfold
                ? (props.searchConfig?.retractText ?? "收起")
                : (props.searchConfig?.expandText ?? "展开")
            }}
          </el-button>
        </div>
      </template>
    </PlusPage>
    <!-- 新增修改 -->
    <PlusDialogForm
      v-if="
        (crudAction.includes('add') && !getCrudConfig('add').btnClick) ||
        (crudAction.includes('edit') && !getCrudConfig('edit').btnClick)
      "
      ref="plusDialogFormInstanceRef"
      v-model:visible="dialogVisible"
      v-model="form"
      :form="{
        columns: columns.map(item => {
          const { formColProps: colProps, ...rest } = item;
          return { colProps, ...rest };
        }),
        rules,
        colProps: {
          span: 12
        },
        rowProps: {
          gutter: 24
        },
        ...props.formConfig
      }"
      :dialog="{
        width: '60%',
        ...props.formDialogConfig,
        title: getCrudConfig(isAdd ? 'add' : 'edit').text,
        hasFooter: true,
        confirmLoading
      }"
      :has-error-tip="false"
      @confirm="handleFormSubmit"
    />
    <!-- 删除 -->
    <!-- TODO 待优化 -->
    <PlusDialog
      v-if="
        (crudAction.includes('delete') && !getCrudConfig('delete').btnClick) ||
        (crudAction.includes('batchDelete') &&
          !getCrudConfig('batchDelete').btnClick)
      "
      v-model="deleteVisible"
      title="系统提示"
      cancel-text="取消"
      confirm-text="确定"
      top="35vh"
      :confirm-loading="confirmLoading"
      @confirm="() => (!isBatchDelete ? confirmDelete() : confirmBatchDelete())"
    >
      <div class="flex items-center">
        <el-icon color="var(--el-color-warning)" size="25px"
          ><WarningFilled
        /></el-icon>
        <span v-if="!isBatchDelete" class="ml-2.5">确认删除该条数据吗?</span>
        <span v-else class="ml-2.5">确认删除选中数据吗?</span>
      </div>
    </PlusDialog>
    <!-- 查看 -->
    <PlusDialog
      v-if="crudAction.includes('view') && !getCrudConfig('view').btnClick"
      v-model="detailVisible"
      :has-footer="false"
      :width="props.viewDialogConfig?.width ?? '1000px'"
      :top="props.viewDialogConfig?.top ?? '10vh'"
      :title="getCrudConfig('view').text"
      @close="form = {}"
    >
      <el-card v-if="detailVisible">
        <div v-for="item in columns" :key="item.prop">
          <div
            class="flex items-center py-2.5"
            style="border-bottom: 1px solid var(--el-border-color)"
          >
            <span
              class="font-semibold mr-2.5"
              :style="{ width: props.viewConfig?.labelWidth ?? '80px' }"
            >
              {{ item.label }}:
            </span>
            <PlusDisplayItem
              :column="{ ...item, editable: false }"
              :row="{ ...form }"
            />
          </div>
        </div>
      </el-card>
    </PlusDialog>
    <ReImport
      v-if="props.importConfig"
      v-model:visible="importVisible"
      v-bind="props.importConfig"
      @success="handleImportSuccess"
      @uploaded-close="plusPageInstanceRef?.getList"
    />
  </div>
</template>

<style scoped lang="scss">
.prop-filter-header {
  border-bottom: 1px solid var(--el-border-color);
}

.prop-filter-body {
  max-height: 150px;
  overflow: auto;
}

.filter-icon {
  color: var(--el-text-color);
}
</style>
