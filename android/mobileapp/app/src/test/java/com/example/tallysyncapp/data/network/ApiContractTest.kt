package com.example.tallysyncapp.data.network

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.reflect.KProperty1
import kotlin.reflect.full.memberProperties
import kotlin.reflect.jvm.isAccessible

/**
 * Parses real backend responses with the app's own Gson models. Gson ignores
 * Kotlin defaults, so an absent field arrives as null inside a non-null property.
 */
class ApiContractTest {
    private val gson = Gson()

    private fun json(name: String) =
        javaClass.getResource("/contract/$name.json")!!.readText()

    private inline fun <reified T> parse(name: String): T =
        gson.fromJson(json(name), object : TypeToken<T>() {}.type)

    private fun assertNoNullsInNonNull(value: Any?, path: String) {
        if (value == null) return
        when (value) {
            is Collection<*> -> value.forEachIndexed { i, v -> assertNoNullsInNonNull(v, "$path[$i]") }
            is String, is Number, is Boolean -> Unit
            else -> {
                if (!value::class.isData) return
                @Suppress("UNCHECKED_CAST")
                for (prop in value::class.memberProperties as Collection<KProperty1<Any, *>>) {
                    prop.isAccessible = true
                    val v = prop.get(value)
                    val where = "$path.${prop.name}"
                    assertTrue("Non-null property $where is null in live response", prop.returnType.isMarkedNullable || v != null)
                    assertNoNullsInNonNull(v, where)
                }
            }
        }
    }

    @Test fun dashboard() {
        val r = parse<ApiResponse<DashboardData>>("dashboard")
        assertTrue(r.success); assertNoNullsInNonNull(r.data, "dashboard")
        assertTrue(r.data.recentOrders.isNotEmpty())
    }

    @Test fun customersList() {
        val r = parse<ApiResponse<List<CustomerListItem>>>("customers")
        assertTrue(r.success); assertTrue(r.data.isNotEmpty()); assertNoNullsInNonNull(r.data, "customers")
    }

    @Test fun productsList() {
        val r = parse<ApiResponse<List<ProductListItem>>>("products")
        assertTrue(r.success); assertTrue(r.data.isNotEmpty()); assertNoNullsInNonNull(r.data, "products")
    }

    @Test fun salesOrdersPage() {
        val r = parse<ApiResponse<SalesOrdersPage>>("salesOrders")
        assertTrue(r.success); assertTrue(r.data.orders.isNotEmpty())
        assertNoNullsInNonNull(r.data, "salesOrders")
        assertTrue(r.data.pagination.total >= r.data.orders.size)
    }

    @Test fun salesOrderDetails() {
        val r = parse<ApiResponse<SalesOrderDetails>>("salesOrder")
        assertTrue(r.success); assertNoNullsInNonNull(r.data, "salesOrder")
        assertTrue("order has lines", r.data.items.isNotEmpty())
    }

    @Test fun customerRecord() = assertNoNullsInNonNull(parse<CustomerRecord>("customer"), "customer")

    @Test fun productRecord() = assertNoNullsInNonNull(parse<ProductRecord>("item"), "item")

    @Test fun suppliersList() {
        // /suppliers returns {data, meta} (no success/message envelope); only `data` is consumed.
        val r = parse<ApiResponse<List<SupplierListItem>>>("suppliers")
        assertTrue(r.data.isNotEmpty()); assertNoNullsInNonNull(r.data, "suppliers")
    }

    @Test fun supplierRecord() = assertNoNullsInNonNull(parse<SupplierListItem>("supplier"), "supplier")

    @Test fun warehousesPage() {
        val r = parse<WarehousesPage>("warehouses")
        assertTrue(r.data.isNotEmpty()); assertNoNullsInNonNull(r, "warehouses")
    }

    @Test fun purchaseOrdersPage() {
        val r = parse<PurchaseOrdersPage>("purchaseOrders")
        assertTrue(r.data.isNotEmpty()); assertNoNullsInNonNull(r.data, "purchaseOrders")
        assertEquals(r.meta.total >= r.data.size, true)
    }

    @Test fun purchaseOrderRecord() = assertNoNullsInNonNull(parse<PurchaseOrderRecord>("purchaseOrder"), "purchaseOrder")
}
