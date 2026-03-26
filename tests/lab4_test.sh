#!/bin/bash
set -e

echo "--- Starting Lab 4 Grading (Helm Check) ---"

# 1. Валідація чарта
echo "Step 1: Running helm lint..."
helm lint ./charts/ecommerce-app

# 2. Перевірка шаблонізації для Prod
echo "Step 2: Checking Production replica count..."
# Helm renders multiple Deployments; first replicas: line is ecommerce-app (sorted before postgres).
REPLICAS=$(helm template ecommerce ./charts/ecommerce-app -f ./charts/ecommerce-app/values-prod.yaml | grep 'replicas:' | head -1 | awk '{print $2}')
if [ "$REPLICAS" != "3" ]; then
    echo "❌ Error: values-prod.yaml should set replicas to 3."
    exit 1
fi

# 3. Dry-run install
echo "Step 3: Testing Dry-run installation..."
helm install ecommerce ./charts/ecommerce-app --dry-run --debug

echo "✅ SUCCESS: Lab 4 is passed!"
