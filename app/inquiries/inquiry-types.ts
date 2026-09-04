export type Inquiry = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  commentCount: number;
  createdAt: string;
};

export type InquiryComment = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
};
