"use client";

import { useState, useEffect, useCallback } from "react";

export interface LearningProgress {
  topicsLearned: number;
  totalTime: number; // 分钟
  recentTopics: TopicRecord[];
  streak: number; // 连续学习天数
}

export interface TopicRecord {
  id: string;
  topic: string;
  timestamp: Date;
  category?: string;
}

const STORAGE_KEY = "edu-ai-learning-progress";

function loadProgress(): LearningProgress {
  if (typeof window === "undefined") {
    return {
      topicsLearned: 0,
      totalTime: 0,
      recentTopics: [],
      streak: 0,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        recentTopics: parsed.recentTopics.map((t: TopicRecord) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        })),
      };
    }
  } catch (e) {
    console.error("Failed to load learning progress:", e);
  }

  return {
    topicsLearned: 0,
    totalTime: 0,
    recentTopics: [],
    streak: 0,
  };
}

function saveProgress(progress: LearningProgress) {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save learning progress:", e);
  }
}

// 根据主题猜测学科分类
function guessCategory(topic: string): string {
  const categories: Record<string, string[]> = {
    "数学": ["函数", "方程", "几何", "代数", "微积分", "概率", "统计", "傅里叶", "矩阵", "向量"],
    "物理": ["力学", "电磁", "光学", "热力学", "量子", "相对论", "牛顿", "开普勒", "波动"],
    "化学": ["分子", "原子", "化学键", "反应", "元素", "有机", "无机", "酸碱"],
    "生物": ["细胞", "DNA", "基因", "进化", "生态", "光合作用", "遗传", "蛋白质"],
    "计算机": ["算法", "排序", "数据结构", "编程", "网络", "二叉树", "递归", "复杂度"],
    "地理": ["地球", "气候", "地质", "板块", "洋流", "大气"],
    "历史": ["朝代", "战争", "革命", "文明", "帝国"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => topic.includes(kw))) {
      return category;
    }
  }
  return "综合";
}

const INITIAL_PROGRESS: LearningProgress = {
  topicsLearned: 0,
  totalTime: 0,
  recentTopics: [],
  streak: 0,
};

export function useLearningProgress() {
  // 初始状态必须是固定值，避免 hydration 不匹配
  const [progress, setProgress] = useState<LearningProgress>(INITIAL_PROGRESS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 仅在客户端加载 localStorage 数据
    setProgress(loadProgress());
    setIsLoaded(true);
  }, []);

  const addTopic = useCallback((topic: string) => {
    setProgress((prev) => {
      const newTopic: TopicRecord = {
        id: `topic-${Date.now()}`,
        topic,
        timestamp: new Date(),
        category: guessCategory(topic),
      };

      const newProgress = {
        ...prev,
        topicsLearned: prev.topicsLearned + 1,
        recentTopics: [newTopic, ...prev.recentTopics].slice(0, 20),
      };

      saveProgress(newProgress);
      return newProgress;
    });
  }, []);

  const getRecentTopics = useCallback((limit = 5) => {
    return progress.recentTopics.slice(0, limit);
  }, [progress.recentTopics]);

  const getCategoryStats = useCallback(() => {
    const stats: Record<string, number> = {};
    progress.recentTopics.forEach((t) => {
      const cat = t.category || "综合";
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  }, [progress.recentTopics]);

  return {
    progress,
    addTopic,
    getRecentTopics,
    getCategoryStats,
  };
}
