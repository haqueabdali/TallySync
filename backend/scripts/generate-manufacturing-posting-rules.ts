import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  dirname,
  resolve,
} from 'node:path';

interface EntityContract {
  file: string;
  className: string;
  table: string | null;
}

interface PostingContract {
  contract: {
    materialConsumption:
      | EntityContract
      | null;
    materialConsumptionLine:
      | EntityContract
      | null;
    productionOrder:
      | EntityContract
      | null;
    productionVariance:
      | EntityContract
      | null;
  };
  detectedFields: {
    materialConsumption:
      Record<
        string,
        string | null
      >;
    materialConsumptionLine:
      Record<
        string,
        string | null
      >;
    productionOrder:
      Record<
        string,
        string | null
      >;
    productionVariance:
      Record<
        string,
        string | null
      >;
  };
  findings: Array<{
    severity: string;
    area: string;
    detail: string;
  }>;
}

function relativeImport(
  from:
    string,
  entityFile:
    string,
): string {
  const clean =
    entityFile
      .replace(/^src\//, '../')
      .replace(/\.ts$/, '');

  /*
   * Generated rules live in:
   * src/accounting-engine/posting-rules
   *
   * So project modules are two levels up.
   */
  return (
    '../../' +
    entityFile
      .replace(/^src\//, '')
      .replace(/\.ts$/, '')
  );
}

function must(
  value:
    string | null | undefined,
  label: string,
): string {
  if (!value) {
    throw new Error(
      `Cannot generate rule: missing ${label}.`,
    );
  }

  return value;
}

function main(): void {
  const input =
    resolve(
      process.cwd(),
      'artifacts/manufacturing-posting-contract.json',
    );

  if (!existsSync(input)) {
    throw new Error(
      'Manufacturing posting contract not found. Run audit:manufacturing:posting-contract first.',
    );
  }

  const report =
    JSON.parse(
      readFileSync(
        input,
        'utf8',
      ),
    ) as PostingContract;

  const errors =
    report.findings.filter(
      (finding) =>
        finding.severity ===
        'ERROR',
    );

  if (errors.length) {
    throw new Error(
      `Refusing to generate posting rules while ${errors.length} contract error(s) remain.`,
    );
  }

  const mc =
    report.contract
      .materialConsumption!;

  const po =
    report.contract
      .productionOrder!;

  const pv =
    report.contract
      .productionVariance!;

  const mcf =
    report.detectedFields
      .materialConsumption;

  const mlf =
    report.detectedFields
      .materialConsumptionLine;

  const pof =
    report.detectedFields
      .productionOrder;

  const pvf =
    report.detectedFields
      .productionVariance;

  const mcCostExpression =
    mcf.totalCost
      ? `Number(source.${mcf.totalCost})`
      : mlf.lineCost
        ? `source.lines.reduce((sum, line) => sum + Number(line.${mlf.lineCost}), 0)`
        : `source.lines.reduce((sum, line) => sum + (Number(line.${must(mlf.quantity, 'material line quantity')}) * Number(line.${must(mlf.unitCost, 'material line unit cost')})), 0)`;

  const poCostExpression =
    pof.actualTotalCost
      ? `Number(source.${pof.actualTotalCost})`
      : `Number(source.${must(pof.actualMaterialCost, 'actualMaterialCost')}) + Number(source.${must(pof.actualLaborCost, 'actualLaborCost')}) + Number(source.${must(pof.actualOverheadCost, 'actualOverheadCost')})`;

  const materialRule = `
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  AccountingSettingsEntity,
} from '../../accounting-settings/entities/accounting-settings.entity';

import {
  JournalEntrySourceType,
} from '../../journal-entries/enums/journal-entry-source-type.enum';

import {
  ${mc.className},
} from '${relativeImport('material', mc.file)}';

import {
  PostingDocument,
} from '../interfaces/posting-document.interface';

import {
  PostingRule,
} from '../interfaces/posting-rule.interface';

@Injectable()
export class MaterialConsumptionPostingRule
  implements PostingRule<${mc.className}>
{
  constructor(
    @InjectRepository(${mc.className})
    private readonly sourceRepository:
      Repository<${mc.className}>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<${mc.className}> {
    const source =
      await this.sourceRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
        relations: {
          lines: true,
        } as never,
      });

    if (!source) {
      throw new NotFoundException(
        'Material consumption not found.',
      );
    }

    return source;
  }

  async build(
    source: ${mc.className},
    companyId: string,
  ): Promise<PostingDocument> {
    if (
      source.${must(mcf.companyId, 'material consumption companyId')} !==
      companyId
    ) {
      throw new NotFoundException(
        'Material consumption not found.',
      );
    }

    const settings =
      await this.settingsRepository.findOne({
        where: { companyId },
      });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    const wip =
      this.requireAccount(
        settings.workInProgressAccountId,
        'Work In Progress',
      );

    const rawMaterials =
      this.requireAccount(
        settings.rawMaterialsInventoryAccountId,
        'Raw Materials Inventory',
      );

    const amount =
      this.round(
        ${mcCostExpression},
      );

    if (amount <= 0) {
      throw new ConflictException(
        'Material consumption cost must be greater than zero.',
      );
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.MATERIAL_CONSUMPTION,
      sourceId:
        source.${must(mcf.id, 'material consumption id')},
      entryDate:
        new Date().toISOString().slice(0, 10),
      reference:
        ${mcf.documentNumber ? `String(source.${mcf.documentNumber})` : `source.${must(mcf.id, 'material consumption id')}`},
      description:
        'Material consumption capitalization into WIP',
      lines: [
        {
          accountId: wip,
          debit: amount,
          credit: 0,
          description:
            'Work in progress - material issue',
          partyType: null,
          partyId: null,
          costCenter: null,
        },
        {
          accountId:
            rawMaterials,
          debit: 0,
          credit: amount,
          description:
            'Raw materials issued to production',
          partyType: null,
          partyId: null,
          costCenter: null,
        },
      ],
    };
  }

  private requireAccount(
    value: string | null,
    label: string,
  ): string {
    if (!value) {
      throw new ConflictException(
        \`\${label} account is not configured.\`,
      );
    }

    return value;
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100;
  }
}
`;

  const completionRule = `
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  AccountingSettingsEntity,
} from '../../accounting-settings/entities/accounting-settings.entity';

import {
  JournalEntrySourceType,
} from '../../journal-entries/enums/journal-entry-source-type.enum';

import {
  ${po.className},
} from '${relativeImport('completion', po.file)}';

import {
  PostingDocument,
} from '../interfaces/posting-document.interface';

import {
  PostingRule,
} from '../interfaces/posting-rule.interface';

@Injectable()
export class ProductionCompletionPostingRule
  implements PostingRule<${po.className}>
{
  constructor(
    @InjectRepository(${po.className})
    private readonly sourceRepository:
      Repository<${po.className}>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<${po.className}> {
    const source =
      await this.sourceRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
      });

    if (!source) {
      throw new NotFoundException(
        'Production order not found.',
      );
    }

    return source;
  }

  async build(
    source: ${po.className},
    companyId: string,
  ): Promise<PostingDocument> {
    if (
      source.${must(pof.companyId, 'production order companyId')} !==
      companyId
    ) {
      throw new NotFoundException(
        'Production order not found.',
      );
    }

    const settings =
      await this.settingsRepository.findOne({
        where: { companyId },
      });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    const finishedGoods =
      this.requireAccount(
        settings.finishedGoodsInventoryAccountId,
        'Finished Goods Inventory',
      );

    const wip =
      this.requireAccount(
        settings.workInProgressAccountId,
        'Work In Progress',
      );

    const amount =
      this.round(
        ${poCostExpression},
      );

    if (amount <= 0) {
      throw new ConflictException(
        'Completed production cost must be greater than zero.',
      );
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.PRODUCTION_COMPLETION,
      sourceId:
        source.${must(pof.id, 'production order id')},
      entryDate:
        new Date().toISOString().slice(0, 10),
      reference:
        ${pof.orderNumber ? `String(source.${pof.orderNumber})` : `source.${must(pof.id, 'production order id')}`},
      description:
        'Finished goods production completion',
      lines: [
        {
          accountId:
            finishedGoods,
          debit: amount,
          credit: 0,
          description:
            'Finished goods received from production',
          partyType: null,
          partyId: null,
          costCenter: null,
        },
        {
          accountId: wip,
          debit: 0,
          credit: amount,
          description:
            'Work in progress transferred to finished goods',
          partyType: null,
          partyId: null,
          costCenter: null,
        },
      ],
    };
  }

  private requireAccount(
    value: string | null,
    label: string,
  ): string {
    if (!value) {
      throw new ConflictException(
        \`\${label} account is not configured.\`,
      );
    }

    return value;
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100;
  }
}
`;

  const varianceRule = `
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  AccountingSettingsEntity,
} from '../../accounting-settings/entities/accounting-settings.entity';

import {
  JournalEntrySourceType,
} from '../../journal-entries/enums/journal-entry-source-type.enum';

import {
  ${pv.className},
} from '${relativeImport('variance', pv.file)}';

import {
  PostingDocument,
} from '../interfaces/posting-document.interface';

import {
  PostingRule,
} from '../interfaces/posting-rule.interface';

@Injectable()
export class ProductionVariancePostingRule
  implements PostingRule<${pv.className}>
{
  constructor(
    @InjectRepository(${pv.className})
    private readonly sourceRepository:
      Repository<${pv.className}>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<${pv.className}> {
    const source =
      await this.sourceRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
      });

    if (!source) {
      throw new NotFoundException(
        'Production variance not found.',
      );
    }

    return source;
  }

  async build(
    source: ${pv.className},
    companyId: string,
  ): Promise<PostingDocument> {
    if (
      source.${must(pvf.companyId, 'production variance companyId')} !==
      companyId
    ) {
      throw new NotFoundException(
        'Production variance not found.',
      );
    }

    const settings =
      await this.settingsRepository.findOne({
        where: { companyId },
      });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    const varianceAccount =
      this.requireAccount(
        settings.manufacturingVarianceAccountId,
        'Manufacturing Variance',
      );

    const wip =
      this.requireAccount(
        settings.workInProgressAccountId,
        'Work In Progress',
      );

    const signedVariance =
      this.round(
        Number(
          source.${must(pvf.totalVariance, 'production variance amount')},
        ),
      );

    if (
      Math.abs(
        signedVariance,
      ) <= 0.009
    ) {
      throw new ConflictException(
        'Production variance amount is zero.',
      );
    }

    const amount =
      Math.abs(
        signedVariance,
      );

    const unfavorable =
      signedVariance > 0;

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.PRODUCTION_VARIANCE,
      sourceId:
        source.${must(pvf.id, 'production variance id')},
      entryDate:
        new Date().toISOString().slice(0, 10),
      reference:
        ${pvf.varianceNumber ? `String(source.${pvf.varianceNumber})` : `source.${must(pvf.id, 'production variance id')}`},
      description:
        'Production variance settlement',
      lines:
        unfavorable
          ? [
              {
                accountId:
                  varianceAccount,
                debit: amount,
                credit: 0,
                description:
                  'Unfavorable manufacturing variance',
                partyType: null,
                partyId: null,
                costCenter: null,
              },
              {
                accountId: wip,
                debit: 0,
                credit: amount,
                description:
                  'WIP variance settlement',
                partyType: null,
                partyId: null,
                costCenter: null,
              },
            ]
          : [
              {
                accountId: wip,
                debit: amount,
                credit: 0,
                description:
                  'WIP variance settlement',
                partyType: null,
                partyId: null,
                costCenter: null,
              },
              {
                accountId:
                  varianceAccount,
                debit: 0,
                credit: amount,
                description:
                  'Favorable manufacturing variance',
                partyType: null,
                partyId: null,
                costCenter: null,
              },
            ],
    };
  }

  private requireAccount(
    value: string | null,
    label: string,
  ): string {
    if (!value) {
      throw new ConflictException(
        \`\${label} account is not configured.\`,
      );
    }

    return value;
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100;
  }
}
`;

  const outputs = [
    {
      path:
        'src/accounting-engine/posting-rules/material-consumption.rule.ts',
      content:
        materialRule,
    },
    {
      path:
        'src/accounting-engine/posting-rules/production-completion.rule.ts',
      content:
        completionRule,
    },
    {
      path:
        'src/accounting-engine/posting-rules/production-variance.rule.ts',
      content:
        varianceRule,
    },
  ];

  for (const output of outputs) {
    const target =
      resolve(
        process.cwd(),
        output.path,
      );

    mkdirSync(
      dirname(target),
      {
        recursive: true,
      },
    );

    writeFileSync(
      target,
      output.content.trimStart(),
      'utf8',
    );

    console.log(
      `Generated ${output.path}`,
    );
  }

  console.log(
    '\nIMPORTANT: generation used only detected live entity fields.',
  );

  console.log(
    'Next wire the three rules into AccountingEngineModule/Service and run build + unit tests.',
  );
}

main();
