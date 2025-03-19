<script lang="ts" setup>
import ReCrud from "@/components/ReCrud/index.vue";
import type { PageInfo } from "plus-pro-components";
import { h, ref } from "vue";
import type {
  CrudActionsConfig,
  CrudColumn,
  ModelValues
} from "@/components/ReCrud/type.ts";
const getList = async (
  query: PageInfo & {
    status?: string;
    name?: string;
    switch?: boolean[];
  }
) => {
  const { page = 1, pageSize = 20, status, name } = query || {};
  console.log(query);
  const total = 30;
  const List = Array.from({ length: total }).map((item, index) => {
    return {
      id: index,
      name: index === 0 ? "name".repeat(20) : index + "name",
      status: String(index % 3),
      tag:
        index === 1
          ? "success"
          : index === 2
            ? "warning"
            : index === 3
              ? "info"
              : "danger",
      progress: 10,
      rate: index > 3 ? 2 : 3.5,
      switch: index % 2 === 0 ? true : false,
      img: "https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg",
      time: new Date(),
      code: `
          const getData = async params => {
            const data = await getData(params)
            return { list: data.data, ...data }
          }`,
      custom: "custom" + index
    };
  });

  const mockList = List.filter(item => {
    if (status.length > 0 && !status.includes(item.status)) {
      return false;
    }
    if (name && name !== item.name) {
      return false;
    }
    // if (swicthValues.length > 0 && !swicthValues.includes(item.switch)) {
    //   return false;
    // }
    return true;
  });

  const pageList = mockList.filter(
    (item, index) => index < pageSize * page && index >= pageSize * (page - 1)
  );

  // 等待2s
  await new Promise(resolve => {
    setTimeout(() => {
      resolve("");
    }, 2000);
  });
  return { data: pageList, success: true, total: mockList.length };
};

const columns: CrudColumn[] = [
  {
    label: "名称",
    tooltip: "名称最多显示6个字符",
    width: 120,
    prop: "name",
    tableColumnProps: {
      showOverflowTooltip: true
    },
    colProps: {
      span: 24
    }
  },
  {
    label: "状态",
    width: 120,
    prop: "status",
    valueType: "select",
    options: [
      {
        label: "未解决",
        value: "0",
        color: "red"
      },
      {
        label: "已解决",
        value: "1",
        color: "blue"
      },
      {
        label: "解决中",
        value: "2",
        color: "yellow"
      },
      {
        label: "失败",
        value: "3",
        color: "red"
      }
    ],
    hideInSearch: true,
    // renderHeader: () => {
    //   return h(
    //     "div",
    //     {
    //       style: {
    //         color: "red"
    //       }
    //     },
    //     "状态"
    //   );
    // },

    filterable: true,
    filterList: async params => {
      await new Promise(resolve => {
        //需要对请求的数据做格式化处理
        setTimeout(() => {
          resolve("");
        }, 2000);
      });
      return [
        {
          label: "未解决",
          value: "0"
        },
        {
          label: "已解决",
          value: "1"
        },
        {
          label: "解决中",
          value: "2"
        },
        {
          label: "失败",
          value: "3"
        }
      ];
    },
    rules: [
      {
        required: true,
        message: "请选择状态",
        trigger: ["blur", "change"]
      }
    ]
  },
  {
    label: "标签",
    width: 120,
    prop: "tag",
    valueType: "tag",
    fieldProps: (value: string) => {
      return { type: value };
    },
    rules: [
      {
        required: true,
        message: "请选择标签",
        trigger: ["blur", "change"]
      }
    ]
    // searchValidate: true
  },
  {
    label: "执行进度",
    width: 200,
    prop: "progress",
    valueType: "progress",
    fieldProps: (value: number) => {
      const data =
        value === 0
          ? { status: "exception" }
          : value > 5
            ? { status: "warning" }
            : value > 3
              ? { status: "success" }
              : { status: "exception" };

      return data;
    }
  },
  {
    label: "代码块",
    width: 250,
    prop: "code",
    hideInSearch: true,
    valueType: "input",
    tableColumnProps: {
      showOverflowTooltip: true
    }
  },
  {
    label: "评分",
    width: 200,
    prop: "rate",
    valueType: "rate",
    hideInSearch: true,
    editable: true
  },
  {
    label: "开关",
    width: 100,
    prop: "switch",
    hideInSearch: true,
    valueType: "switch",
    editable: true,
    filterable: true,
    filterList: async params => {
      console.log(params);
      await new Promise(resolve => {
        //需要对请求的数据做格式化处理
        setTimeout(() => {
          resolve("");
        }, 1000);
      });
      return [
        {
          label: "开",
          value: 0
        },
        {
          label: "关",
          value: 1
        }
      ];
    }
  },
  {
    label: "图片",
    prop: "img",
    width: 100,
    hideInSearch: true,
    valueType: "img",
    hideInForm: true
  },
  {
    label: "时间",
    prop: "time",
    valueType: "date-picker",
    hideInForm: true,
    width: 200,
    colProps: {
      span: 12
    }
  }
];
const crudConfigs: CrudActionsConfig[] = [
  {
    type: "add",
    request: async () => {
      return { success: true };
    }
  },
  {
    type: "edit",
    request: async () => {
      return { success: true };
    },
    disabled: (row: any) => {
      return row.status === "1";
    }
  },
  {
    type: "delete",
    request: async () => {
      return { success: true };
    }
  },
  {
    type: "view",
    request: async (data: any) => {
      return { success: true, data: data };
    }
  },
  {
    type: "batchDelete",
    request: async (data: any) => {
      return { success: true };
    }
  }
];
const searchParams = ref<ModelValues["searchParams"]>({});
</script>

<template>
  <div>
    <ReCrud
      v-model:search-params="searchParams"
      permission-module="test"
      :columns="columns"
      :fixed-search-params="{ xxx: '1' }"
      :crud-configs="crudConfigs"
      :page-request="getList"
      :import-config="{
        action: '/noApi/gcbiz/op/file/V1/upload',
        templateUrl: 'https://usedfu.xcmg.com/2025/03/10/687011102915035392.png'
      }"
    />
  </div>
</template>
