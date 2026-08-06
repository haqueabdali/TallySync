import { PostingDocument } from './posting-document.interface';

export interface PostingRule<TSource = unknown> {
  build(
    source: TSource,
    companyId: string,
  ): Promise<PostingDocument>;
}
