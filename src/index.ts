import { NativeScriptSchema } from './schema';

// Test 1: "any" type with multiple sig scripts
const jsonAny = {
  scripts: [
    { hash: 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01', type: 'cmt' },
    { hash: 'b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef0123', type: 'cmt' },
    { hash: 'c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef012345', type: 'cmt' },
  ],
  type: 'any',
};

// Test 2: "atLeast" type with required field
const jsonAtLeast = {
  scripts: [
    { hash: 'd4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01234567', type: 'cmt' },
    { hash: 'e5f6789012345678abcdef0123456789abcdef0123456789abcdef0123450123', type: 'cmt' },
    { hash: 'f6789012345678abcdef0123456789abcdef0123456789abcdef0123456789ab', type: 'cmt' },
    { hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', type: 'cmt' },
  ],
  required: 4,
  type: 'atLeast',
};

// Test 3: Nested script (atLeast containing all containing sigs)
const jsonNested = {
  type: 'atLeast',
  required: 2,
  scripts: [
    {
      type: 'all',
      scripts: [
        {
          hash: 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01',
          type: 'cmt',
        },
        {
          hash: 'b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef0100',
          type: 'cmt',
        },
      ],
    },
    { hash: 'c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef010000', type: 'cmt' },
  ],
};

function test(name: string, json: unknown) {
  const result = NativeScriptSchema.safeParse(json);
  if (result.success) {
    console.log(`✅ ${name}: Valid`);
  } else {
    console.error(`❌ ${name}:`, result.error.format());
  }
}

function main() {
  console.log('Testing native script schemas...\n');
  test('any type', jsonAny);
  test('atLeast type', jsonAtLeast);
  test('nested script', jsonNested);
  test('single cmt clause', {
    hash: 'd92b712d1882c3b0f75b6f677e0b2cbef4fbc8b8121bb9dde324ff09abcdef01',
    type: 'cmt',
  });
  test('single after clause', { block: 1000, type: 'after' });
  test('single before clause', { block: 3000, type: 'before' });
  test('all with after + cmt', {
    scripts: [
      { block: 1000, type: 'after' },
      { hash: '966e394a544f242081e41d1965137b1bb412ac230d40ed5407821c3700000000', type: 'cmt' },
    ],
    type: 'all',
  });
}

main();
